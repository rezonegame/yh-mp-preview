/**
 * xiaohu 主题转换器
 * 将 xiaohu-wechat-format 的主题格式转换为 mp-preview 格式
 *
 * 使用方法: npx ts-node scripts/convert-xiaohu-themes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// xiaohu 主题格式
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
    styles: {
        [key: string]: {
            [prop: string]: string;
        };
    };
    dark_mode?: {
        [key: string]: {
            [prop: string]: string;
        };
    };
}

// mp-preview 主题格式
interface MpPreviewTemplate {
    id: string;
    name: string;
    description: string;
    isPreset: boolean;
    isVisible: boolean;
    source: string;
    styles: {
        container: string;
        title: {
            h1: { base: string; content: string; after: string };
            h2: { base: string; content: string; after: string };
            h3: { base: string; content: string; after: string };
            base: { base: string; content: string; after: string };
        };
        paragraph: string;
        list: { container: string; item: string; taskList: string };
        quote: string;
        code: {
            header: { container: string; dot: string; colors: [string, string, string] };
            block: string;
            inline: string;
        };
        image: string;
        link: string;
        emphasis: { strong: string; em: string; del: string };
        table: { container: string; header: string; cell: string };
        hr: string;
        footnote: { ref: string; backref: string };
        containers?: {
            dialogue?: {
                container?: string;
                title?: string;
                bubbleLeft?: string;
                bubbleRight?: string;
                speaker?: string;
                text?: string;
            };
            gallery?: {
                container?: string;
                title?: string;
                scroll?: string;
                item?: string;
                image?: string;
            };
        };
        accentColor?: string;
    };
}

/**
 * 将 xiaohu 样式对象转换为 CSS 字符串
 */
function styleToCss(style: { [prop: string]: string } | undefined): string {
    if (!style) return '';
    return Object.entries(style)
        .map(([key, value]) => {
            // 将下划线转换为连字符
            const cssKey = key.replace(/_/g, '-');
            return `${cssKey}: ${value}`;
        })
        .join('; ');
}

/**
 * 转换单个主题
 */
function convertTheme(xiaohu: XiaohuTheme, filename: string): MpPreviewTemplate {
    const id = `xiaohu-${filename.replace('.json', '')}`;
    const accent = xiaohu.colors.accent;

    // 构建标题样式
    const buildTitleStyle = (level: 'h1' | 'h2' | 'h3') => {
        const style = xiaohu.styles[level];
        return {
            base: styleToCss(style),
            content: style?.color ? `color: ${style.color}` : '',
            after: ''
        };
    };

    // 构建代码块头部颜色
    const codeHeaderColors: [string, string, string] = [
        '#ff5f56', '#ffbd2e', '#27ca40'  // 默认红黄绿
    ];

    // 构建容器样式
    const dialogueStyle = {
        container: 'margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 12px;',
        title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
        bubbleLeft: `max-width: 80%; background: #fff; border-left: 3px solid ${accent}; border-radius: 0 12px 12px 12px; padding: 10px 14px; margin: 8px auto 8px 0;`,
        bubbleRight: `max-width: 80%; background: ${accent}14; border-right: 3px solid ${accent}; border-radius: 12px 0 12px 12px; padding: 10px 14px; margin: 8px 0 8px auto;`,
        speaker: 'font-size: 12px; color: #999; margin: 0 0 4px 0;',
        text: 'font-size: 15px; color: #333; line-height: 1.6; margin: 0;'
    };

    const galleryStyle = {
        container: 'margin: 20px 0;',
        title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
        scroll: 'display: flex; overflow-x: auto; gap: 12px; padding: 4px 0; scroll-snap-type: x mandatory;',
        item: `flex: 0 0 auto; width: 200px; height: 200px; scroll-snap-align: start; overflow: hidden; border-radius: 8px; border: 2px solid ${accent}20;`,
        image: 'width: 100%; height: 100%; object-fit: cover;'
    };

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
                h1: buildTitleStyle('h1'),
                h2: buildTitleStyle('h2'),
                h3: buildTitleStyle('h3'),
                base: {
                    base: styleToCss({ ...xiaohu.styles.h4, ...xiaohu.styles.h5, ...xiaohu.styles.h6 }),
                    content: xiaohu.styles.h4?.color || '#333',
                    after: ''
                }
            },
            paragraph: styleToCss(xiaohu.styles.p),
            list: {
                container: styleToCss(xiaohu.styles.list_wrapper),
                item: styleToCss(xiaohu.styles.list_item_text),
                taskList: 'list-style: none; padding-left: 0;'
            },
            quote: styleToCss(xiaohu.styles.blockquote),
            code: {
                header: {
                    container: styleToCss(xiaohu.styles.code_header),
                    dot: 'width: 10px; height: 10px; border-radius: 50%; margin-right: 6px;',
                    colors: codeHeaderColors
                },
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
                dialogue: dialogueStyle,
                gallery: galleryStyle
            },
            accentColor: accent
        }
    };
}

/**
 * 主函数：转换所有主题
 */
async function main() {
    const xiaohuDir = path.resolve(__dirname, '../../xiaohu-wechat-format/themes');
    const outputDir = path.resolve(__dirname, '../src/templates/xiaohu');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 获取所有主题文件
    const files = fs.readdirSync(xiaohuDir).filter(f => f.endsWith('.json'));

    console.log(`找到 ${files.length} 个 xiaohu 主题文件`);

    const convertedTemplates: string[] = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(xiaohuDir, file), 'utf-8');
            const xiaohuTheme: XiaohuTheme = JSON.parse(content);

            const mpPreviewTheme = convertTheme(xiaohuTheme, file);

            // 写入转换后的主题文件
            const outputFile = path.join(outputDir, file);
            fs.writeFileSync(outputFile, JSON.stringify(mpPreviewTheme, null, 2), 'utf-8');

            convertedTemplates.push(mpPreviewTheme.id);
            console.log(`✓ 转换成功: ${xiaohuTheme.name} -> ${mpPreviewTheme.id}`);
        } catch (error) {
            console.error(`✗ 转换失败: ${file}`, error);
        }
    }

    // 生成索引文件
    const indexContent = `/**
 * xiaohu 主题集合
 * 由 scripts/convert-xiaohu-themes.ts 自动生成
 */

${files.map(f => {
    const id = f.replace('.json', '');
    return `import ${id.replace(/-/g, '_')} from './${f}';`;
}).join('\n')}

export const xiaohuThemes = {
${files.map(f => {
    const id = f.replace('.json', '');
    return `    'xiaohu-${id}': ${id.replace(/-/g, '_')},`;
}).join('\n')}
};
`;

    const indexFile = path.join(outputDir, 'index.ts');
    fs.writeFileSync(indexFile, indexContent, 'utf-8');

    console.log(`\n完成！共转换 ${convertedTemplates.length} 个主题`);
    console.log(`索引文件: ${indexFile}`);
}

main().catch(console.error);