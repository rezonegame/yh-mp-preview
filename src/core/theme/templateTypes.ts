import type { DialogueStyle, GalleryStyle } from '../../containers';
import type { ThemeFrameworkId, ThemeSurface } from './themeCatalog';

export type HeadingStyle = Record<'base' | 'content' | 'after', string>;
export interface TemplateStyles extends Record<'container' | 'paragraph' | 'quote' | 'image' | 'link' | 'hr', string> {
    title: Record<'h1' | 'h2' | 'h3' | 'base', HeadingStyle>;
    list: Record<'container' | 'item' | 'taskList', string>;
    code: Record<'block' | 'inline', string> & {
        header: Record<'container' | 'dot', string> & { colors: [string, string, string] };
        syntax?: Record<string, string>;
    };
    emphasis: Record<'strong' | 'em' | 'del', string>;
    table: Record<'container' | 'header' | 'cell', string>;
    footnote: Record<'ref' | 'backref', string>;
    containers?: { dialogue?: Partial<DialogueStyle>; gallery?: Partial<GalleryStyle> };
    accentColor?: string;
}
export interface Template {
    id: string;
    name: string;
    description: string;
    styles: TemplateStyles;
    source?: string;
    isPreset?: boolean;
    isVisible?: boolean;
    themeMeta?: {
        frameworkId?: ThemeFrameworkId;
        surfaces?: ThemeSurface[];
        scene?: string;
        recommendation?: string;
    };
}
