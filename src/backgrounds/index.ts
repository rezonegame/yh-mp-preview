import { renderPattern } from '../core/settings/backgroundDraft';
import type { Background } from '../backgroundManager';

const presets: Background[] = [
    { id: 'default', name: '默认', style: 'background-color: #f8f8f8;' },
    { id: 'none', name: '无背景', style: 'background-color: #ffffff;' },
];
const patterns = [
    ['grid', '网格', renderPattern('grid', '#320000', 0.03, 20)],
    ['crosshatch', '交叉', 'background-image: repeating-linear-gradient(45deg, rgba(50, 0, 0, 0.02) 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, rgba(50, 0, 0, 0.02) 0 1px, transparent 1px 10px); background-size: 20px 20px;'],
    ['dots', '圆点', renderPattern('polkaDots', '#320000', 0.03, 20)],
    ['dash', '虚线', 'background-image: radial-gradient(ellipse 3px 0.5px at center, rgba(50, 0, 0, 0.03) 95%, transparent 100%); background-size: 12px 12px;'],
    ['wave', '波浪', renderPattern('wave', '#320000', 0.04, 30)],
    ['checkerboard', '棋盘', renderPattern('checkerboard', '#320000', 0.04, 20)],
];
export const backgrounds = { backgrounds: [...presets, ...patterns.map(([id, name, style]) => ({ id, name, style }))] };
