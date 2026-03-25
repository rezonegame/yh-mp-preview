/**
 * 容器模块入口
 * 导出对话气泡和图片画廊的解析与渲染功能
 */

// 解析器
export {
    parseContainers,
    generateContainerMarker,
    isContainerMarker,
    type ParsedDialogue,
    type ParsedGallery,
    type ParsedContainer,
    type DialogueLine
} from './ContainerParser';

// 对话气泡渲染器
export {
    renderDialogue,
    createDialogueElement,
    applyDialogueStyle,
    type DialogueStyle
} from './DialogueRenderer';

// 图片画廊渲染器
export {
    renderGallery,
    createGalleryElement,
    applyGalleryStyle,
    resolveImagePath,
    type GalleryStyle
} from './GalleryRenderer';