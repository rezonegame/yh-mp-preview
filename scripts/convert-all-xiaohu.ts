/**
 * xiaohu 主题转换脚本
 * 运行: npx ts-node scripts/convert-all-xiaohu.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface XiaohuTheme {
    name: string;
    description: string;
    colors: {
        primary: string;
        accent: string;
        background: string;
        blockquote_bg: string;
        code_bg: string;
        hr_color: string;
        footnote_bg: string;
    };
    styles: { [key: string]: { [prop: string]: string } };
}

interface MpTemplate {
    id: string;
    name: string;
    description: string;
    isPreset: boolean;
    isVisible: boolean;
    source: string;
    styles: {
        container: string;
        title: { h1: { base: string; content: string; after: string }; h2: { base: string; content: string; after: string }; h3: { base: string; content: string; after: string }; base: { base: string; content: string; after: string } };
        paragraph: string;
        list: { container: string; item: string; taskList: string };
        quote: string;
        code: { header: { container: string; dot: string; colors: [string, string, string] }; block: string; inline: string };
        image: string;
        link: string;
        emphasis: { strong: string; em: string; del: string };
        table: { container: string; header: string; cell: string };
        hr: string;
        footnote: { ref: string; backref: string };
        containers: { dialogue: any; gallery: any };
        accentColor: string;
    };
}

function styleToCss(style: { [prop: string]: string } | undefined): string {
    if (!style) return '';
    return Object.entries(style).map(([k, v]) => `${k.replace(/_/g, '-')}: ${v}`).join('; ');
}

function convertTheme(xiaohu: XiaohuTheme, filename: string): MpTemplate {
    const id = `xiaohu-${filename.replace('.json', '')}`;
    const accent = xiaohu.colors.accent;

    return {
        id,
        name: `${xiaohu.name} (xiaohu)`,
        description: xiaohu.description,
        isPreset: true,
        isVisible: true,
        source: 'xiaohu',
        styles: {
            container: styleToCss(xiaohu.styles.wrapper),
            title: {
                h1: { base: styleToCss(xiaohu.styles.h1), content: `color: ${xiaohu.styles.h1?.color || accent}`, after: '' },
                h2: { base: styleToCss(xiaohu.styles.h2), content: `color: ${xiaohu.styles.h2?.color || accent}`, after: '' },
                h3: { base: styleToCss(xiaohu.styles.h3), content: `color: ${xiaohu.styles.h3?.color || accent}`, after: '' },
                base: { base: styleToCss({ ...xiaohu.styles.h4, ...xiaohu.styles.h5 }), content: `color: ${xiaohu.styles.h4?.color || '#333'}`, after: '' }
            },
            paragraph: styleToCss(xiaohu.styles.p),
            list: {
                container: styleToCss(xiaohu.styles.list_wrapper),
                item: styleToCss(xiaohu.styles.list_item_text),
                taskList: 'list-style: none; padding-left: 0;'
            },
            quote: styleToCss(xiaohu.styles.blockquote),
            code: {
                header: { container: styleToCss(xiaohu.styles.code_header), dot: 'width: 10px; height: 10px; border-radius: 50%; margin-right: 6px;', colors: ['#ff5f56', '#ffbd2e', '#27ca40'] },
                block: styleToCss(xiaohu.styles.code_block),
                inline: styleToCss(xiaohu.styles.code)
            },
            image: styleToCss(xiaohu.styles.img),
            link: styleToCss(xiaohu.styles.a),
            emphasis: {
                strong: styleToCss(xiaohu.styles.strong),
                em: styleToCss(xiaohu.styles.em),
                del: 'text-decoration: line-through; color: #999;'
            },
            table: {
                container: styleToCss(xiaohu.styles.table),
                header: styleToCss(xiaohu.styles.th),
                cell: styleToCss(xiaohu.styles.td)
            },
            hr: styleToCss(xiaohu.styles.hr),
            footnote: {
                ref: styleToCss(xiaohu.styles.footnote_sup),
                backref: 'color: #999; text-decoration: none;'
            },
            containers: {
                dialogue: {
                    container: 'margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 12px;',
                    title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
                    bubbleLeft: `max-width: 80%; background: #fff; border-left: 3px solid ${accent}; border-radius: 0 12px 12px 12px; padding: 10px 14px; margin: 8px auto 8px 0;`,
                    bubbleRight: `max-width: 80%; background: ${accent}14; border-right: 3px solid ${accent}; border-radius: 12px 0 12px 12px; padding: 10px 14px; margin: 8px 0 8px auto;`,
                    speaker: 'font-size: 12px; color: #999; margin: 0 0 4px 0;',
                    text: 'font-size: 15px; color: #333; line-height: 1.6; margin: 0;'
                },
                gallery: {
                    container: 'margin: 20px 0;',
                    title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
                    scroll: 'display: flex; overflow-x: auto; gap: 12px; padding: 4px 0; scroll-snap-type: x mandatory;',
                    item: `flex: 0 0 auto; width: 200px; height: 200px; scroll-snap-align: start; overflow: hidden; border-radius: 8px; border: 2px solid ${accent}20;`,
                    image: 'width: 100%; height: 100%; object-fit: cover;'
                }
            },
            accentColor: accent
        }
    };
}

const XIAOHU_DIR = 'C:/Users/wudao/AppData/Local/Temp/xiaohu-wechat-format/themes';
const OUTPUT_DIR = 'C:/github/mp-preview/src/templates/xiaohu';

async function main() {
    const files = fs.readdirSync(XIAOHU_DIR).filter(f => f.endsWith('.json'));
    console.log(`找到 ${files.length} 个 xiaohu 主题`);

    const imports: string[] = [];
    const exports: string[] = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(XIAOHU_DIR, file), 'utf-8');
            const xiaohu: XiaohuTheme = JSON.parse(content);
            const mp = convertTheme(xiaohu, file);

            const outputFile = path.join(OUTPUT_DIR, file);
            fs.writeFileSync(outputFile, JSON.stringify(mp, null, 4), 'utf-8');

            const varName = file.replace('.json', '').replace(/-/g, '_');
            imports.push(`import ${varName} from './${file}';`);
            exports.push(`    'xiaohu-${file.replace('.json', '')}': ${varName},`);

            console.log(`✓ ${xiaohu.name}`);
        } catch (e) {
            console.error(`✗ ${file}: ${e}`);
        }
    }

    // 生成索引
    const indexContent = `/**
 * xiaohu 主题集合
 * 由 convert-all-xiaohu.ts 自动生成
 */

${imports.join('\n')}

export const xiaohuThemes = {
${exports.join('\n')}
};
`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent, 'utf-8');
    console.log(`\n完成！索引文件已更新`);
}

main().catch(console.error);