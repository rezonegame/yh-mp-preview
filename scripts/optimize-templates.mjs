/**
 * 批量优化所有模板排版间距（单次完整版）
 *
 * 优化规则（参考微信公众号原生排版）：
 * 1. 标题 margin-top 缩减约 25%
 *    - h1: 32→24, 36→26, 40→28, 50→32
 *    - h2: 28→20, 30→22, 34→24
 *    - h3: 24→18, 28→20
 *    - base(h4-h6): 20→14
 * 2. 表格 cell padding: ≤10px → 12px
 * 3. 引用块 padding: ≤15px → 14px 18px
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const TEMPLATES_DIR = join(import.meta.dirname, '..', 'src', 'templates');

// ===== 标题 margin-top 目标值映射 =====
const MARGIN_TOP_MAP = {
    50: 32, 48: 30, 46: 28,
    44: 28, 42: 28, 40: 28,
    38: 26, 36: 26, 34: 24,
    32: 24, 30: 22, 28: 20,
    26: 18, 24: 18, 22: 16,
    20: 14, 18: 14, 16: 12,
};

/**
 * 查找最接近的 margin-top 目标值
 */
function getTargetMarginTop(original) {
    const num = parseInt(original);
    if (isNaN(num) || num === 0) return null;

    // 精确匹配
    if (MARGIN_TOP_MAP[num] !== undefined) {
        return MARGIN_TOP_MAP[num];
    }

    // 向上找最近的映射键
    const keys = Object.keys(MARGIN_TOP_MAP).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
        if (num >= key - 2 && num <= key + 2) {
            // 按比例微调目标值
            const ratio = num / key;
            return Math.round(MARGIN_TOP_MAP[key] * ratio);
        }
    }

    // 超出范围的值：统一缩减 25%
    if (num > 50) return Math.round(num * 0.64);
    if (num < 12) return num; // 太小不动
    return num;
}

/**
 * 优化 CSS 中的 margin-top（简写和独立属性）
 */
function optimizeMarginsInCss(cssStr) {
    // 处理简写 margin: top right bottom [left];
    cssStr = cssStr.replace(
        /(?<![a-z-])margin\s*:\s*(\d+)(px|em|rem)(\s[^;]+);/g,
        (match, topVal, unit, rest) => {
            const target = getTargetMarginTop(topVal);
            if (target === null) return match;
            return `margin: ${target}${unit}${rest};`;
        }
    );

    // 处理简写 margin: top 0 0 (三值)
    cssStr = cssStr.replace(
        /(?<![a-z-])margin\s*:\s*(\d+)(px)\s+(\d+)(px)\s+(\d+)(px)/g,
        (match, topVal, u1, rightVal, u2, bottomVal, u3) => {
            const target = getTargetMarginTop(topVal);
            if (target === null) return match;
            return `margin: ${target}px ${rightVal}px ${bottomVal}px`;
        }
    );

    // 处理独立 margin-top: XXpx
    cssStr = cssStr.replace(
        /margin-top\s*:\s*(\d+)(px|em|rem)/g,
        (match, val, unit) => {
            const target = getTargetMarginTop(val);
            if (target === null) return match;
            return `margin-top: ${target}${unit}`;
        }
    );

    return cssStr;
}

/**
 * 优化表格 cell padding
 */
function optimizeTableCellPadding(cssStr) {
    return cssStr.replace(
        /padding\s*:\s*(\d+)px/g,
        (match, num) => {
            const val = parseInt(num);
            if (val <= 10) return 'padding: 12px';
            return match;
        }
    );
}

/**
 * 优化引用块 padding
 */
function optimizeQuotePadding(cssStr) {
    // padding: 10px 10px → 14px 18px
    cssStr = cssStr.replace(
        /padding\s*:\s*10px\s+10px/g,
        'padding: 14px 18px'
    );
    // padding: 10px; → 14px 18px;
    cssStr = cssStr.replace(
        /padding\s*:\s*10px;/g,
        'padding: 14px 18px;'
    );
    // padding: 15px; → 14px 18px;
    cssStr = cssStr.replace(
        /padding\s*:\s*15px;/g,
        'padding: 14px 18px;'
    );
    // padding: 15px 15px → 14px 18px
    cssStr = cssStr.replace(
        /padding\s*:\s*15px\s+15px/g,
        'padding: 14px 18px'
    );
    return cssStr;
}

/**
 * 优化单个模板
 */
function optimizeTemplate(template) {
    const styles = template.styles;
    if (!styles) return template;

    // === 1. 标题 margin-top ===
    if (styles.title) {
        for (const level of ['h1', 'h2', 'h3', 'base']) {
            const titleStyle = styles.title[level];
            if (!titleStyle) continue;
            if (titleStyle.base) {
                titleStyle.base = optimizeMarginsInCss(titleStyle.base);
            }
        }
    }

    // === 2. 表格 cell padding ===
    if (styles.table) {
        if (styles.table.cell) {
            styles.table.cell = optimizeTableCellPadding(styles.table.cell);
        }
        if (styles.table.header) {
            styles.table.header = optimizeTableCellPadding(styles.table.header);
        }
    }

    // === 3. 引用块 padding ===
    if (styles.quote) {
        styles.quote = optimizeQuotePadding(styles.quote);
    }

    return template;
}

function main() {
    let totalFiles = 0;
    let modifiedFiles = 0;

    function processDirectory(dir) {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                processDirectory(fullPath);
                continue;
            }
            if (!entry.endsWith('.json')) continue;

            totalFiles++;
            const original = readFileSync(fullPath, 'utf-8');
            const template = JSON.parse(original);
            const optimized = optimizeTemplate(template);
            const result = JSON.stringify(optimized, null, 4) + '\n';

            if (result !== original) {
                writeFileSync(fullPath, result, 'utf-8');
                modifiedFiles++;
                console.log(`  ✓ ${entry}`);
            }
        }
    }

    console.log('🔧 优化模板排版（单次完整版）...\n');
    processDirectory(TEMPLATES_DIR);
    console.log(`\n✅ 完成: 检查 ${totalFiles} 个模板，优化 ${modifiedFiles} 个文件`);
}

main();
