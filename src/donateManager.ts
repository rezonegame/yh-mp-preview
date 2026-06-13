
import { App, Plugin } from 'obsidian';
import { DONATE_QR } from './assets/donate';
import { QRCODE_QR } from './assets/qrcode';

export class DonateManager {
    private static overlay: HTMLElement;
    private static modal: HTMLElement;
    private static app: App;
    private static plugin: Plugin;

    public static initialize(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    public static showDonateModal(container: HTMLElement) {
        this.overlay = container.createEl('div', {
            cls: 'mp-donate-overlay'
        });

        this.modal = this.overlay.createEl('div', {
            cls: 'mp-about-modal'
        });

        // 添加关闭按钮
        const closeButton = this.modal.createEl('button', {
            cls: 'mp-donate-close',
            text: '×'
        });

        // 添加作者信息区域
        const authorSection = this.modal.createEl('div', {
            cls: 'mp-about-section mp-about-intro-section'
        });

        authorSection.createEl('h4', {
            text: '关于作者',
            cls: 'mp-about-title'
        });

        const introEl = authorSection.createEl('p', {
            cls: 'mp-about-intro'
        });
        
        // 使用 createEl 替代 innerHTML
        introEl.createSpan({ text: '你好，我是' });
        introEl.createSpan({ text: 'yhwang', cls: 'mp-about-name' });
        introEl.createSpan({ text: '，一名' });
        introEl.createSpan({ text: '全职写作与独立开发者', cls: 'mp-about-identity' });
        introEl.createSpan({ text: '。' });

        const roleList = authorSection.createEl('div', {
            cls: 'mp-about-roles'
        });

        const roleEl = roleList.createEl('p', {
            cls: 'mp-about-role'
        });
        
        // 使用 createEl 和 createSpan 替代 innerHTML
        roleEl.createSpan({ text: '这款插件是我为了在 Obsidian 写作后，' });
        roleEl.createEl('br');
        roleEl.createSpan({ text: '无需繁琐排版一键即可发布到公众号而开发的工具，' });
        roleEl.createEl('br');
        roleEl.createSpan({ text: '希望能让你的' });
        roleEl.createSpan({ text: '排版更轻松', cls: 'mp-about-highlight' });
        roleEl.createSpan({ text: '，让你的' });
        roleEl.createSpan({ text: '创作更高效', cls: 'mp-about-value' });
        roleEl.createSpan({ text: '。' });

        // 添加插件介绍
        const descEl = authorSection.createEl('p', {
            cls: 'mp-about-desc'
        });
        
        // 使用 createEl 替代 innerHTML
        descEl.createSpan({ text: '如果这款插件对你有帮助，' });
        descEl.createEl('br');
        descEl.createSpan({ text: '或者你愿意支持我的独立开发与写作，欢迎请我喝咖啡☕️。' });
        descEl.createEl('br');
        descEl.createSpan({ text: '你的支持来说意义重大，它能让我更专注地开发、写作。' });

        // 添加打赏区域
        const donateSection = this.modal.createEl('div', {
            cls: 'mp-about-section mp-about-donate-section'
        });

        donateSection.createEl('h4', {
            text: '请我喝咖啡',
            cls: 'mp-about-subtitle'
        });

        const donateQR = donateSection.createEl('div', {
            cls: 'mp-about-qr'
        });
        donateQR.createEl('img', {
            attr: {
                src: DONATE_QR,
                alt: '打赏二维码'
            }
        });

        // 添加公众号区域
        const mpSection = this.modal.createEl('div', {
            cls: 'mp-about-section mp-about-mp-section'
        });

        const mpDescEl = mpSection.createEl('p', {
            cls: 'mp-about-desc'
        });
        
        // 使用 createEl 替代 innerHTML
        mpDescEl.createSpan({ text: '如果你想了解更多关于创作、效率工具的小技巧，' });
        mpDescEl.createEl('br');
        mpDescEl.createSpan({ text: '或者关注我未来的写作动态，欢迎关注我的微信公众号。' });

        mpSection.createEl('h4', {
            text: '微信公众号',
            cls: 'mp-about-subtitle'
        });

        const mpQR = mpSection.createEl('div', {
            cls: 'mp-about-qr'
        });
        mpQR.createEl('img', {
            attr: {
                src: QRCODE_QR,
                alt: '公众号二维码'
            }
        });

        const footerEl = mpSection.createEl('p', {
            cls: 'mp-about-footer'
        });
        
        // 使用 createEl 替代 innerHTML
        footerEl.createSpan({ text: '期待与你一起，在创作的世界里' });
        const strongText = footerEl.createEl('strong');
        strongText.createSpan({ text: '找到属于自己的意义' });
        footerEl.createSpan({ text: '。' });

        // 添加关闭事件
        closeButton.addEventListener('click', () => this.closeDonateModal());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeDonateModal();
            }
        });
    }

    private static closeDonateModal() {
        if (this.overlay) {
            this.overlay.remove();
        }
    }
}
