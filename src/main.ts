import { Plugin, Notice } from 'obsidian';
import { MPView, VIEW_TYPE_MP } from './view';
import { TemplateManager } from './templateManager';
import { SettingsManager } from './settings/settings';
import { MPConverter } from './converter';
import { DonateManager } from './donateManager';
import { MPSettingTab } from './settings/MPSettingTab';
import { ThemeRegistry } from './core/theme/themeRegistry';
import { adaptLegacyTemplate } from './core/theme/legacyThemeAdapter';
import { NoteLayoutStore } from './core/note-layout/noteLayoutStore';
import { NoteLayoutEnhancement } from './core/note-layout/noteLayoutEnhancement';
export default class MPPlugin extends Plugin {
  settingsManager: SettingsManager;
  templateManager: TemplateManager;
  themeRegistry: ThemeRegistry;
  noteLayoutStore: NoteLayoutStore;
  noteLayoutEnhancement: NoteLayoutEnhancement;
  async onload() {
    // 初始化设置管理器
    this.settingsManager = new SettingsManager(this);
    await this.settingsManager.loadSettings();

    this.noteLayoutStore = new NoteLayoutStore(
      this.app.vault.adapter,
      this.manifest.dir || `.obsidian/plugins/${this.manifest.id}`,
    );
    try {
      await this.noteLayoutStore.load();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : '笔记排版设置读取失败，已禁用笔记排版增强');
    }
    this.noteLayoutEnhancement = new NoteLayoutEnhancement(this, this.app, this.noteLayoutStore);
    this.noteLayoutEnhancement.load();

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

    this.addCommand({
      id: 'toggle-note-layout-enhancement',
      name: '切换笔记排版增强',
      callback: async () => {
        try {
          const enabled = !this.noteLayoutEnhancement.isEnabled();
          await this.noteLayoutEnhancement.setEnabled(enabled);
          new Notice(enabled ? '笔记排版增强已开启' : '笔记排版增强已关闭');
        } catch (error) {
          new Notice(error instanceof Error ? error.message : '笔记排版设置保存失败');
        }
      },
    });

    this.addCommand({
      id: 'restore-note-layout-backup',
      name: '恢复最近的笔记排版设置备份',
      callback: async () => {
        try {
          const backup = await this.noteLayoutStore.restoreLatestBackup();
          new Notice(backup ? `已恢复笔记排版备份：${backup.createdAt}` : '没有可恢复的笔记排版备份');
        } catch (error) {
          new Notice(error instanceof Error ? error.message : '笔记排版备份恢复失败');
        }
      },
    });

    // 在插件的 onload 方法中添加：
    this.addSettingTab(new MPSettingTab(this.app, this));
  }

  onunload() {
    this.noteLayoutEnhancement?.unload();
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
