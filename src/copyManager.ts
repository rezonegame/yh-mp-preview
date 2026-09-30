import { Notice } from 'obsidian';
import { prepareLegacyWechatFragment, type LegacyWechatOptions, type LegacyWechatPreparation } from './core/render/legacyWechatPipeline';
import type { ValidationReport } from './core/validation/wechatHtmlValidator';
import { embedArticleImages, type ResourceOptions } from './core/resources/imageResources';

/** All output adapters consume the same detached, complete article. */
export class CopyManager {
    public static async processImagesForExport(container: HTMLElement, options: ResourceOptions = {}): Promise<void> {
        await embedArticleImages(container, options);
    }
    public static async prepareForExport(element: HTMLElement, options: LegacyWechatOptions = {}, resources: ResourceOptions = {}): Promise<LegacyWechatPreparation> {
        const section=element.matches('.mp-content-section') ? element : element.querySelector<HTMLElement>('.mp-content-section');
        if(!section) throw new Error('找不到内容区域');
        const preparation=prepareLegacyWechatFragment(section,options);
        if(preparation.validation.errors>0) throw new Error(`发现 ${preparation.validation.errors} 项阻断问题，已取消复制或导出`);
        await this.processImagesForExport(preparation.root,resources);
        preparation.html=new XMLSerializer().serializeToString(preparation.root);
        preparation.text=preparation.root.textContent || '';
        return preparation;
    }
    public static async copyToClipboard(element: HTMLElement, options: LegacyWechatOptions = {}, resources: ResourceOptions = {}): Promise<ValidationReport> {
        try {
            const prepared=await this.prepareForExport(element,options,resources);
            const clipData=new ClipboardItem({
                'text/html':new Blob([prepared.html],{type:'text/html'}),
                'text/plain':new Blob([prepared.text],{type:'text/plain'}),
            });
            if(resources.signal?.aborted) throw new Error('操作已取消');
            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
            return prepared.validation;
        } catch(error) {
            new Notice(`复制失败：${error instanceof Error ? error.message : '未知错误'}`);
            throw error;
        }
    }
}
