import type { Template } from '../../templateManager';

export interface WechatPalette {
    accent: string;
    accentText: string;
    onAccent: string;
    surface: string;
    border: string;
    foreground: string;
}

function rgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '');
    return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}

function hex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(first: string, second: string, firstWeight: number): string {
    const a = rgb(first);
    const b = rgb(second);
    return hex(...a.map((value, index) => value * firstWeight + b[index] * (1 - firstWeight)) as [number, number, number]);
}

function luminance(color: string): number {
    const channels = rgb(color).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

export function resolveWechatPalette(template?: Template): WechatPalette {
    const rawAccent = template?.styles.accentColor || '#475569';
    const accent = /^#[\da-f]{6}$/i.test(rawAccent) ? rawAccent.toLowerCase() : '#475569';
    const surface = mix(accent, '#ffffff', 0.06);
    let accentText = accent;
    while (contrast(accentText, '#ffffff') < 4.6 || contrast(accentText, surface) < 4.6) {
        accentText = mix(accentText, '#000000', 0.9);
    }
    return {
        accent,
        accentText,
        onAccent: contrast('#ffffff', accent) >= 4.5 ? '#ffffff' : '#111827',
        surface,
        border: mix(accent, '#ffffff', 0.25),
        foreground: '#263238',
    };
}
