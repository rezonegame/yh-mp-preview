import { Plugin, Notice } from 'obsidian';
import { MPView, VIEW_TYPE_MP } from './view';
import { TemplateManager } from './templateManager';
import { SettingsManager } from './settings/settings';
import { MPConverter } from './converter';
import { DonateManager } from './donateManager';
import { MPSettingTab } from './settings/MPSettingTab';
import { ThemeRegistry } from './core/theme/themeRegistry';
import { adaptLegacyTemplate } from './core/theme/legacyThemeAdapter';
export default class MPPlugin extends Plugin {
  settingsManager: SettingsManager;
  templateManager: TemplateManager;
  themeRegistry: ThemeRegistry;
  async onload() {
    // 初始化设置管理器
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();

    // 初始化模板管理器
    this.templateManager = new TemplateManager(this.app, this.settingsManager);
    this.themeRegistry = new ThemeRegistry();
    this.themeRegistry.replaceAll(this.settingsManager.getAllTemplates().map(adaptLegacyTemplate));

    // 初始化转换器
    MPConverter.initialize(this.app);

    DonateManager.initialize(this.app, this);

    // 注册视图
    this.registerView(
      VIEW_TYPE_MP,
      (leaf) => new MPView(leaf, this.templateManager, this.settingsManager)
    );

    // 自动打开视图但不聚焦
    // this.app.workspace.onLayoutReady(() => {
    //     const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MP);
    //     if (leaves.length === 0) {
    //         const rightLeaf = this.app.workspace.getRightLeaf(false);
    //         if (rightLeaf) {
    //             rightLeaf.setViewState({
    //                 type: VIEW_TYPE_MP,
    //                 active: false,
    //             });
    //         }
    //     }
    // });

    // 添加一个功能按钮用于打开所有面板
    this.addRibbonIcon("eye", "打开公众号预览", () => {
      this.activateView();
    });

    // 添加命令到命令面板
    this.addCommand({
            id: 'open-yh-mp-preview',
            name: '打开 yh-mp-preview',
      callback: async () => {
        await this.activateView();
            }
    });

    // 在插件的 onload 方法中添加：
    this.addSettingTab(new MPSettingTab(this.app, this));
  }

  async activateView() {
    // 如果视图已经存在，激活它
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MP);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }

    // 创建新视图
    const rightLeaf = this.app.workspace.getRightLeaf(false);
    if (rightLeaf) {
      await rightLeaf.setViewState({
        type: VIEW_TYPE_MP,
        active: true,
      });
    } else {
      // 如果无法获取右侧面板，显示错误提示
            new Notice('无法创建视图面板');
    }
  }
}
