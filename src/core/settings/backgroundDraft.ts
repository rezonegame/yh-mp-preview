import { cloneSettings } from './settingsRepository';
import type { Background } from '../../backgroundManager';

export const patternLabels = {
    custom: '自定义', grid: '网格', diagonalStripes: '对角条纹',
    polkaDots: '波尔卡圆点', zigzag: '锯齿形', honeycomb: '蜂窝', wave: '波浪', checkerboard: '棋盘',
} as const;
export type PatternId = keyof typeof patternLabels;
export interface BackgroundControls {
    mode: 'color' | 'css'; color: string; pattern: PatternId;
    ink: string; opacity: number; scale: number; css: string;
}
const bound = (value: number, min: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/** Generate geometry from parameters, never replace every px literal. */
export function renderPattern(id: Exclude<PatternId, 'custom'>, ink: string, opacity: number, scale: number): string {
    if (!/^#[\da-f]{6}$/i.test(ink)) throw new Error('图案颜色无效');
    const rgb = [1, 3, 5].map(offset => Number.parseInt(ink.slice(offset, offset + 2), 16));
    const tone = `rgba(${rgb.join(', ')}, ${bound(opacity, 0, 1)})`;
    const unit = bound(scale, 5, 50);
    const stroke = Math.max(0.5, unit / 20);
    const images: Record<Exclude<PatternId, 'custom'>, string> = {
        grid: `linear-gradient(to right, ${tone} ${stroke}px, transparent ${stroke}px), linear-gradient(to bottom, ${tone} ${stroke}px, transparent ${stroke}px)`,
        diagonalStripes: `repeating-linear-gradient(135deg, ${tone} 0 ${unit / 4}px, transparent ${unit / 4}px ${unit / 2}px)`,
        polkaDots: `radial-gradient(circle, ${tone} ${stroke}px, transparent ${stroke + 0.5}px)`,
        zigzag: `linear-gradient(135deg, ${tone} 25%, transparent 25%), linear-gradient(225deg, ${tone} 25%, transparent 25%), linear-gradient(45deg, ${tone} 25%, transparent 25%), linear-gradient(315deg, ${tone} 25%, transparent 25%)`,
        honeycomb: `repeating-linear-gradient(60deg, ${tone} 0 ${stroke}px, transparent ${stroke}px ${unit}px), repeating-linear-gradient(-60deg, ${tone} 0 ${stroke}px, transparent ${stroke}px ${unit}px), repeating-linear-gradient(0deg, ${tone} 0 ${stroke}px, transparent ${stroke}px ${unit * 1.732}px)`,
        wave: `repeating-radial-gradient(ellipse at 50% 100%, transparent 0 ${unit / 4}px, ${tone} ${unit / 4}px ${unit / 4 + stroke}px, transparent ${unit / 4 + stroke}px ${unit / 2}px)`,
        checkerboard: `conic-gradient(${tone} 25%, transparent 0 50%, ${tone} 0 75%, transparent 0)`,
    };
    return `background-image: ${images[id]}; background-size: ${unit}px ${id === 'honeycomb' ? unit * 1.732 : unit}px;`;
}

function readControls(style: string): BackgroundControls {
    const controls: BackgroundControls = { mode: 'css', color: '#f5f5f5', pattern: 'custom', ink: '#320000', opacity: 0.03, scale: 20, css: style };
    const declarations = style.split(';').map(part => part.trim()).filter(Boolean);
    const simple = declarations.every(part => /^(?:background-color|box-sizing|margin|padding)\s*:/i.test(part));
    const color = /background-color\s*:\s*(#[\da-f]{3,8})\b/i.exec(style)?.[1];
    if (simple && color && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) {
        controls.mode = 'color';
        controls.color = color.length === 4 ? '#' + [...color.slice(1)].map(char => char.repeat(2)).join('') : color;
    }
    const rgba = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i.exec(style);
    if (rgba) {
        controls.ink = '#' + rgba.slice(1, 4).map(value => bound(Number(value), 0, 255).toString(16).padStart(2, '0')).join('');
        controls.opacity = rgba[4] === undefined ? 1 : bound(Number(rgba[4]), 0, 1);
    }
    const size = /background-size\s*:\s*([\d.]+)px/i.exec(style)?.[1];
    if (size) controls.scale = bound(Number(size), 5, 50);
    return controls;
}

/** Untouched CSS is opaque: editing only the name preserves all old declarations. */
export class BackgroundDraft {
    readonly background: Background;
    readonly controls: BackgroundControls;
    private styleChanged = false;
    constructor(initial: Background) {
        this.background = cloneSettings(initial);
        this.controls = readControls(initial.style);
    }
    update(patch: Partial<BackgroundControls>): void {
        Object.assign(this.controls, patch);
        this.styleChanged = true;
    }
    style(): string {
        if (!this.styleChanged) return this.background.style;
        const state = this.controls;
        if (state.mode === 'color') return `background-color: ${state.color};`;
        return state.pattern === 'custom' ? state.css : renderPattern(state.pattern, state.ink, state.opacity, state.scale);
    }
    commit(): Background {
        if (!this.background.name.trim()) throw new Error('请输入背景名称');
        const style = this.style();
        if (!style.trim()) throw new Error('背景样式不能为空');
        return { ...cloneSettings(this.background), style };
    }
}
