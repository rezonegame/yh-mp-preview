import type { Template, TemplateStyles, HeadingStyle } from './templateTypes';
import { getCuratedThemeEntry, type WechatReadingProfile } from './themeCatalog';
import { resolveWechatPalette, type WechatPalette } from './wechatPalette';
import { setSafeInlineStyle } from '../security/safeDom';
import type { Typography } from './templateStylePlan';

export const READING_THEME_REVISION = 'reading-2026.1';
export interface ReadingThemeTokens {
    revision: string;
    profile: WechatReadingProfile;
    rootCss: string;
    captionCss: string;
    component: { shape: 'side' | 'box' | 'rule' | 'open' | 'note'; padding: number; gap: number; radius: number };
}
interface ReadingDesign {
    accent: string; paper?: string; h1: number; h2: number; chapterGap: number;
    chapter: 'line' | 'open' | 'anchor' | 'bar' | 'double';
    quote: 'side' | 'open' | 'note' | 'box'; quoteGap: number; listGap: number; listRule?: boolean;
    imageGap: number; imageFrame: boolean; component: ReadingThemeTokens['component']['shape'];
}
// Author-owned editorial designs. Geometry, not colour alone, differentiates every scene pair.
const designs: Readonly<Record<string, ReadingDesign>> = {
    default: { accent:'#475569',h1:1.8,h2:1.32,chapterGap:1.9,chapter:'line',quote:'side',quoteGap:1.1,listGap:.35,imageGap:1.1,imageFrame:true,component:'side' },
    'deep-reading': { accent:'#202124',h1:2,h2:1.48,chapterGap:2.5,chapter:'open',quote:'open',quoteGap:1.6,listGap:.8,imageGap:1.9,imageFrame:false,component:'open' },
    'clear-guide': { accent:'#087f75',h1:1.8,h2:1.3,chapterGap:1.7,chapter:'anchor',quote:'side',quoteGap:1,listGap:.25,listRule:true,imageGap:.85,imageFrame:true,component:'box' },
    'knowledge-notes': { accent:'#355f59',paper:'#fbfcfa',h1:1.72,h2:1.23,chapterGap:2.2,chapter:'line',quote:'note',quoteGap:1.35,listGap:.55,imageGap:1.25,imageFrame:false,component:'note' },
    'apple-product': { accent:'#0a84ff',h1:2.1,h2:1.48,chapterGap:2.4,chapter:'open',quote:'open',quoteGap:1.65,listGap:.65,imageGap:1.8,imageFrame:false,component:'open' },
    'product-review': { accent:'#059669',h1:1.78,h2:1.25,chapterGap:1.6,chapter:'bar',quote:'box',quoteGap:1,listGap:.22,listRule:true,imageGap:.8,imageFrame:true,component:'box' },
    'red-white-editorial': { accent:'#c2413b',h1:1.9,h2:1.34,chapterGap:1.8,chapter:'anchor',quote:'side',quoteGap:1.15,listGap:.3,imageGap:1.05,imageFrame:true,component:'side' },
    'ink-opinion': { accent:'#353535',h1:2.04,h2:1.48,chapterGap:2.45,chapter:'line',quote:'open',quoteGap:1.65,listGap:.78,imageGap:1.65,imageFrame:false,component:'rule' },
    'data-blueprint': { accent:'#173f7a',h1:1.8,h2:1.26,chapterGap:1.65,chapter:'bar',quote:'side',quoteGap:1,listGap:.24,listRule:true,imageGap:.85,imageFrame:true,component:'box' },
    'briefing-grid': { accent:'#355a72',h1:1.72,h2:1.23,chapterGap:2,chapter:'double',quote:'note',quoteGap:1.35,listGap:.52,imageGap:1.25,imageFrame:false,component:'rule' },
    'zen-essence': { accent:'#79836f',h1:1.8,h2:1.26,chapterGap:2.6,chapter:'open',quote:'open',quoteGap:1.8,listGap:.82,imageGap:1.9,imageFrame:false,component:'open' },
    'warm-paper': { accent:'#805c46',paper:'#fbf7ef',h1:1.76,h2:1.32,chapterGap:1.85,chapter:'line',quote:'box',quoteGap:1.1,listGap:.36,imageGap:1,imageFrame:true,component:'note' },
    'olive-journal': { accent:'#4a6041',h1:1.84,h2:1.36,chapterGap:1.9,chapter:'anchor',quote:'side',quoteGap:1.1,listGap:.4,imageGap:1.1,imageFrame:false,component:'side' },
    'case-file': { accent:'#40505c',h1:1.72,h2:1.25,chapterGap:2.3,chapter:'double',quote:'note',quoteGap:1.5,listGap:.72,listRule:true,imageGap:1.55,imageFrame:true,component:'rule' },
};
export function hasReadingTheme(id: string): boolean { return Boolean(Object.prototype.hasOwnProperty.call(designs, id)); }
export function buildReadingTheme(base: Template): Template | undefined {
    const design = designs[base.id]; if (!design) return undefined;
    const palette = resolveWechatPalette({ ...base, styles: { ...base.styles, accentColor: design.accent } });
    const profile = getCuratedThemeEntry(base.id)?.readingProfile ?? 'standard';
    const line = profile === 'airy' ? 1.82 : profile === 'compact' ? 1.72 : 1.78;
    const gap = profile === 'airy' ? 1.05 : profile === 'compact' ? .85 : .95;
    const foreground = '#263238', secondary = '#52606d';
    const chapter = {
        line:`border-bottom:1px solid ${palette.border};padding-bottom:.5em;`, open:'border:0;padding:0;',
        anchor:`border-left:3px solid ${palette.accent};padding:.12em 0 .12em .7em;`,
        bar:`border-left:3px solid ${palette.accent};background:${palette.surface};padding:.5em .65em;`,
        double:`border-bottom:3px double ${palette.border};padding-bottom:.55em;`,
    }[design.chapter];
    const title: TemplateStyles['title'] = { h1: heading(design.h1,1.9,.8,'',foreground), h2:heading(design.h2,design.chapterGap,.75,chapter,foreground),
        h3:heading(1.14,1.65,.55,design.chapter==='anchor'?`border-left:2px solid ${palette.border};padding-left:.65em;`:'',palette.accentText),
        h4:heading(1.07,1.4,.5,'',foreground),h5:heading(1.02,1.25,.45,'',foreground),h6:heading(.98,1.15,.4,'',secondary),base:heading(1,1.2,.5,'',foreground) };
    const quote = {
        side:`border-left:3px solid ${palette.accent};background:${palette.surface};padding:.7em .9em;`,
        open:`border:0;border-top:1px solid ${palette.border};border-bottom:1px solid ${palette.border};background:transparent;padding:1em .25em;`,
        note:`border:0;border-top:1px solid ${palette.border};background:transparent;padding:.7em .2em;`,
        box:`border:1px solid ${palette.border};background:${palette.surface};padding:.8em 1em;`,
    }[design.quote];
    const styles: TemplateStyles = {
        container:`background:${design.paper ?? '#ffffff'};padding:16px 20px;color:${foreground};`,accentColor:design.accent,title,
        paragraph:`color:${foreground};font-weight:400;line-height:${line};letter-spacing:0;text-align:left;margin:0 0 ${gap}em;`,
        list:{container:`margin:.85em 0 1.15em;padding:0 0 0 1.45em;color:${foreground};text-align:left;`,
            item:`color:${foreground};line-height:${line};margin:0 0 ${design.listGap}em;padding:0 0 ${design.listRule?'.3em':'0'};${design.listRule?`border-bottom:1px solid ${palette.border};`:''}`,
            taskList:`list-style:none;color:${foreground};line-height:${line};margin-bottom:${design.listGap}em;`},
        quote:`margin:${design.quoteGap}em 0;${quote}color:${secondary};font-style:normal;line-height:${line};`,
        code:{header:{container:'display:none;',dot:'display:none;',colors:[design.accent,design.accent,design.accent]},
            block:`margin:1.2em 0;padding:14px;background:${palette.surface};border:1px solid ${palette.border};color:${foreground};font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14px;line-height:1.65;`,
            inline:`padding:.1em .3em;background:${palette.surface};color:${foreground};font-family:ui-monospace,Consolas,monospace;font-size:.9em;line-height:1.5;`},
        image:`display:block;margin:${design.imageGap}em auto;border:${design.imageFrame?`1px solid ${palette.border}`:'0'};border-radius:${design.imageFrame?'2px':'0'};`,
        link:`color:${palette.accentText};text-decoration:underline;background-image:none;`,
        emphasis:{strong:`font-weight:700;color:${foreground};`,em:`color:${foreground};font-style:italic;`,del:`color:${secondary};text-decoration:line-through;`},
        table:{container:`margin:1.2em 0;border-collapse:collapse;border-top:${design.chapter==='double'?'3px double':'2px solid'} ${palette.accent};`,
            header:`padding:8px;background:${palette.surface};color:${foreground};font-weight:700;border:0;border-bottom:1px solid ${palette.border};font-size:.9em;line-height:1.6;`,
            cell:`padding:8px;background:transparent;color:${foreground};border:0;border-bottom:1px solid ${palette.border};font-size:.9em;line-height:1.65;`},
        hr:`margin:1.8em 0;border:0;border-top:1px solid ${palette.border};`,footnote:{ref:`color:${palette.accentText};`,backref:`color:${palette.accentText};`},
    };
    return { ...structuredClone(base),styles,reading:{revision:READING_THEME_REVISION,profile,
        rootCss:`background:${design.paper??'#ffffff'};margin:0;padding:16px 20px;color:${foreground};box-sizing:border-box;max-width:100%;`,
        captionCss:`font-size:.85em;line-height:1.6;color:${secondary};text-align:left;margin:.4em 0 ${design.imageGap}em;`,
        component:{shape:design.component,padding:design.component==='open'?4:14,gap:design.component==='open'?1.6:1.1,radius:design.component==='box'?4:0}} };
}
function heading(size:number,before:number,after:number,decoration:string,color:string): HeadingStyle {
    return {base:`font-size:${size}em;font-weight:700;line-height:1.45;letter-spacing:0;text-align:left;margin:${before}em 0 ${after}em;${decoration}`,content:`color:${color};font-weight:inherit;`,after:'display:none;'};
}

/** Pure root composition: default means theme paper; explicit user background and nonzero padding win. */
export function readingRootCss(tokens: ReadingThemeTokens, typography: Typography, background: {id:string;style:string;isPreset?:boolean}|null): string {
    const explicit = background && background.id !== 'default' ? background.style : '';
    return joinReadingCss(tokens.rootCss, explicit, `font-family:${typography.family};font-size:${typography.size}px;`);
}
export function joinReadingCss(...parts: string[]): string {
    return parts.map(part => part.replace(/;+\s*$/, '')).filter(Boolean).join('; ');
}
const marker = 'data-mp-reading-base-style';
export function resetReadingSpecifics(root: HTMLElement): void {
    root.querySelectorAll(`[${marker}]`).forEach(node=>{const saved=node.getAttribute(marker)!; if(saved)node.setAttribute('style',saved);else node.removeAttribute('style');node.removeAttribute(marker);});
}
export function ownStyle(element: Element, css: string): void {
    if(!element.hasAttribute(marker))element.setAttribute(marker,element.getAttribute('style')??'');
    setSafeInlineStyle(element,css);
}
/** Roles are chosen from our component structure, never guessed from hexadecimal colours. */
export function applyReadingComponentRoles(root: HTMLElement, palette: WechatPalette, tokens: ReadingThemeTokens): void {
    const c=tokens.component;
    const frame={side:`border:0;border-left:3px solid ${palette.accent};background:${palette.surface};`,box:`border:1px solid ${palette.border};background:${palette.surface};`,
        rule:`border:0;border-top:2px solid ${palette.accent};background:transparent;`,open:'border:0;background:transparent;',note:`border:1px solid ${palette.border};background:${palette.surface};`}[c.shape];
    root.querySelectorAll('.mp-layout-card,.mp-frontmatter-card').forEach(card=>{
        ownStyle(card,`margin:${c.gap}em 0;padding:${c.padding}px;border-radius:${c.radius}px;box-shadow:none;text-align:left;box-sizing:border-box;max-width:100%;${frame}color:${palette.foreground};`);
        card.querySelectorAll<HTMLElement>('*').forEach(item=>{
            if(item.tagName==='IMG')return;
            const semantic=card.getAttribute('data-mp-layout')==='checklist'&&item.tagName==='SPAN'&&item===item.parentElement?.firstElementChild;
            const status=semantic&&item.textContent?.trim()==='✓'?'#1a6c32':semantic&&item.textContent?.trim()==='!'?'#885100':null;
            const inline=item.style.display==='inline-flex';
            ownStyle(item,joinReadingCss(item.getAttribute('style')??'',`color:${status??palette.foreground};box-shadow:none;${item.style.backgroundColor?`background:${palette.surface};`:''}${inline?'display:inline-block;width:auto;height:auto;min-width:1.7em;padding:.1em .3em;text-align:center;border-radius:.25em;':item.style.display==='flex'?'display:block;width:auto;':''}max-width:100%;box-sizing:border-box;`));
        });
        if(card.firstElementChild) ownStyle(card.firstElementChild,joinReadingCss(card.firstElementChild.getAttribute('style')??'',`color:${palette.accentText};`));
        card.querySelectorAll('.mp-layout-author-card img').forEach(image=>ownStyle(image,joinReadingCss(image.getAttribute('style')??'','width:54px;height:54px;object-fit:cover;border-radius:50%;')));
    });
    const semanticCallouts=new Set(['warning','caution','danger','success','check','failure','bug']);
    root.querySelectorAll('.mp-callout').forEach(callout=>{
        const type=callout.getAttribute('data-callout-type')??'';
        if(semanticCallouts.has(type)){
            const warning=type==='warning'||type==='caution',success=type==='success'||type==='check';
            const foreground=warning?'#885100':success?'#1a6c32':'#9b2626';
            const surface=warning?'#fff5e6':success?'#eff8f0':'#fff2f2';
            ownStyle(callout,joinReadingCss(callout.getAttribute('style')??'',`background:${surface};`));
            callout.querySelectorAll('.mp-callout-title').forEach(title=>ownStyle(title,joinReadingCss(title.getAttribute('style')??'',`color:${foreground};display:block;`)));
            return;
        }
        ownStyle(callout,`margin:${c.gap}em 0;padding:${c.padding}px;border-radius:${c.radius}px;${frame}color:${palette.foreground};`);
        callout.querySelectorAll('.mp-callout-title').forEach(title=>ownStyle(title,joinReadingCss(title.getAttribute('style')??'',`color:${palette.accentText};display:block;`)));
    });
}
