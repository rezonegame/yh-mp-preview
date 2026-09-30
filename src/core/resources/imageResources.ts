import { requestUrl } from 'obsidian';
import { safeUrl } from '../security/safeDom';

export interface ImageResponse { status: number; mime: string; bytes: ArrayBuffer }
export type ImageLoader = (url: string, signal: AbortSignal) => Promise<ImageResponse>;
export interface ResourceOptions { signal?: AbortSignal; timeoutMs?: number; concurrency?: number; maxImageBytes?: number; maxTotalBytes?: number; loader?: ImageLoader }
const rasterMime = /^image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon)$/i;

const loadImage: ImageLoader = async (url, signal) => {
    if (/^https?:/i.test(url)) {
        // Host API avoids browser CORS. Obsidian requests cannot be physically
        // aborted; the operation still times out and ignores any late response.
        const response = await requestUrl({ url, throw: false });
        return { status: response.status, mime: response.headers['content-type'] || '', bytes: response.arrayBuffer };
    }
    const response = await fetch(url, { signal });
    return { status: response.status, mime: response.headers.get('content-type') || '', bytes: await response.arrayBuffer() };
};

function asDataUri(bytes: ArrayBuffer, mime: string): string {
    const array = new Uint8Array(bytes);
    let binary = '';
    for (let start=0; start<array.length; start+=8192) binary += String.fromCharCode(...array.subarray(start,start+8192));
    return `data:${mime};base64,${btoa(binary)}`;
}

/** Operation-local cache and bounded workers. Never mutates the live article. */
export async function embedArticleImages(root: HTMLElement, options: ResourceOptions = {}): Promise<void> {
    const ownerWindow=root.ownerDocument.defaultView;
    if(!ownerWindow) throw new Error('文章窗口不可用');
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const cache = new Map<string, Promise<string>>();
    const maxImage = options.maxImageBytes ?? 12*1024*1024;
    const maxTotal = options.maxTotalBytes ?? 40*1024*1024;
    let total = 0;
    const get = (url: string): Promise<string> => {
        const cached=cache.get(url); if(cached) return cached;
        const task = (async () => {
            if(controller.signal.aborted) throw new Error('操作已取消');
            if(!safeUrl(url,'image')) throw new Error('不支持的图片地址');
            if(/^data:/i.test(url)) {
                const size=Math.ceil((url.split(',')[1]?.length || 0)*3/4);
                if(size>maxImage || total+size>maxTotal) throw new Error('图片超过大小限制');
                total+=size;return url;
            }
            const response = await new Promise<ImageResponse>((resolve,reject) => {
                const finish = (callback: () => void) => { ownerWindow.clearTimeout(timer); controller.signal.removeEventListener('abort',cancel); callback(); };
                const cancel = () => finish(() => reject(new Error('操作已取消')));
                const timer = ownerWindow.setTimeout(() => finish(() => reject(new Error('图片加载超时'))), options.timeoutMs ?? 10_000);
                controller.signal.addEventListener('abort',cancel,{once:true});
                const loader=options.loader ?? loadImage;
                void Promise.resolve().then(() => loader(url,controller.signal)).then(value => finish(() => resolve(value)), (error: unknown) => finish(() => reject(error instanceof Error ? error : new Error('图片请求失败'))));
            });
            if(controller.signal.aborted) throw new Error('操作已取消');
            if(response.status<200 || response.status>=300) throw new Error(`图片请求失败（HTTP ${response.status}）`);
            const mime=response.mime.split(';')[0].trim().toLowerCase();
            if(!rasterMime.test(mime)) throw new Error('图片类型不受支持，需使用 PNG/JPEG 等位图');
            if(!response.bytes.byteLength || response.bytes.byteLength>maxImage || total+response.bytes.byteLength>maxTotal) throw new Error('图片为空或超过大小限制');
            total+=response.bytes.byteLength;
            return asDataUri(response.bytes,mime);
        })();
        cache.set(url,task); return task;
    };
    const images=Array.from(root.querySelectorAll('img'));
    let index=0;
    const worker = async () => {
        while(index<images.length) {
            const image=images[index++];
            try { const url=await get(image.src); if(controller.signal.aborted) throw new Error('操作已取消'); image.src=url;image.removeAttribute('srcset'); }
            catch(error) { abort(); throw new Error(`第 ${images.indexOf(image)+1} 张图片：${error instanceof Error ? error.message : '加载失败'}`); }
        }
    };
    try { await Promise.all(Array.from({length:Math.min(images.length,Math.max(1,Math.min(4,options.concurrency ?? 3)))},()=>worker())); }
    finally { options.signal?.removeEventListener('abort',abort); }
}
