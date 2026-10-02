/* Run only via Obsidian CLI vault=MPPreview-Refactor-Test eval. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'];
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0]?.view;
    if (!view) throw new Error('Isolated preview must be open');
    const root = view.containerEl.querySelector('.mp-view-content');
    const settings = root.querySelector('.mp-settings-disclosure');
    const focus = root.querySelector('.mp-focus-button');
    const sidebar = app.workspace.rightSplit.containerEl;
    const originalStyle = root.getAttribute('style');
    const sidebarStyle = sidebar.getAttribute('style');
    const theme = document.body.className;
    const file = app.vault.getAbstractFileByPath('Regression.md');
    const source = await app.vault.read(file);
    const preferences = JSON.stringify(plugin.settingsManager.getSettings());
    const results = [], dimensions = [];
    const delay = ms => new Promise(resolve => require('timers').setTimeout(resolve, ms));
    const check = (name, pass, detail = null) => {
        results.push({name, pass:Boolean(pass), detail});
        if (!pass) throw new Error(name + ': ' + JSON.stringify(detail));
    };
    try {
        await view.onFileOpen(file);
        for (const mode of ['theme-light','theme-dark']) {
            document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);
            for (const [width,height] of [[900,700],[600,460],[375,700],[320,460],[260,360],[900,320]]) {
                document.activeElement?.blur();
                sidebar.style.width = width + 'px';root.style.blockSize = height + 'px';
                // Background host windows can defer ResizeObserver. Exercise the same
                // real measurement callback via the window-resize fallback as well.
                window.dispatchEvent(new Event('resize'));
                await delay(180);
                const bounds = root.getBoundingClientRect();
                const compact = root.clientWidth < 520 || root.clientHeight < 560;
                check(`${mode} responsive settings ${width}x${height}`, settings.open === !compact, {compact,open:settings.open});
                const overflow = [...root.querySelectorAll('button,select,input,summary')].filter(el=>{
                    const box=el.getBoundingClientRect();return box.width>0 && (box.left<bounds.left-1 || box.right>bounds.right+1);
                }).map(el=>el.getAttribute('aria-label') || el.textContent);
                check(`${mode} controls fit ${width}x${height}`,overflow.length === 0,overflow);
                const ratio = view.previewEl.clientHeight / root.clientHeight;
                dimensions.push({mode,width,height,paneWidth:root.clientWidth,previewHeight:view.previewEl.clientHeight,ratio,compact});
                check(`${mode} preview gets majority ${width}x${height}`,ratio >= .55,ratio);
                check(`${mode} footer stays one row ${width}x${height}`, [...root.querySelectorAll('.mp-primary-row > button')].every(el=>Math.abs(el.getBoundingClientRect().top - root.querySelector('.mp-copy-button').getBoundingClientRect().top)<1));
                if (compact) {
                    settings.querySelector('summary').click();await delay(20);
                    check(`${mode} settings remain reachable ${width}x${height}`,settings.open && root.querySelector('.mp-toolbar').clientHeight>0);
                    check(`${mode} settings overlay does not shrink preview ${width}x${height}`,Math.abs(view.previewEl.clientHeight - dimensions.at(-1).previewHeight)<1);
                    focus.click();await delay(20);
                    check(`${mode} focus remains usable ${width}x${height}`, focus.getAttribute('aria-pressed') === 'true' && view.previewEl.clientHeight/root.clientHeight>.55);
                    focus.click();await delay(20);
                }
            }
        }
        sidebar.style.width='600px';root.style.blockSize='460px';window.dispatchEvent(new Event('resize'));await delay(200);
        const before = await view.createExportSnapshot();const baseline={width:before.width,height:before.height,html:before.element.innerHTML};before.cleanup();
        focus.click();await delay(50);
        const after = await view.createExportSnapshot();
        check('focus preserves exact export dimensions and HTML',after.width === baseline.width && after.height === baseline.height && after.element.innerHTML === baseline.html);
        after.cleanup();focus.click();
        const validation = root.querySelector('.mp-validation-details');
        check('nonblocking warnings initially collapsed', !validation.open);
        validation.querySelector('summary').click();
        check('all warning paths retained', root.querySelectorAll('.mp-validation-issues ul > li').length === view.validationReport.issues.length);
        validation.open=false;
        const invalidImage=view.previewEl.querySelector('.mp-content-section').createEl('img');
        try {
            view.refreshValidationReport();
            check('actual blocking issue disables copy and opens details',view.copyButton.disabled && root.querySelector('.mp-validation-details').open);
            focus.click();
            check('blocking status remains visible in focus preview',root.querySelector('.mp-validation-panel').getBoundingClientRect().height>0);
            focus.click();
        } finally {invalidImage.remove();view.refreshValidationReport();root.querySelector('.mp-validation-details').open=false;}
        check('copy recovers after blocking issue removed',!view.copyButton.disabled);
        const exported=[];
        const methods=['exportLongImage','exportHtmlFragment','exportSegmentedImages'];
        const originalMethods=methods.map(name=>view[name]);
        try {
            methods.forEach(name=>view[name]=async button=>exported.push({name,button:button.className}));
            for(const [index,title] of ['导出长图','导出 HTML','导出分段图'].entries()) {
                root.querySelector('.mp-export-button').click();await delay(50);
                const items=[...document.querySelectorAll('.menu .menu-item')];
                const item=items.find(el=>el.textContent.trim()===title);
                check(`native export menu contains ${title}`,Boolean(item));item.click();await delay(50);
                check(`native export menu invokes ${methods[index]}`,exported.at(-1)?.name===methods[index]);
            }
        } finally {methods.forEach((name,index)=>view[name]=originalMethods[index]);}
        check('settings are unchanged',preferences === JSON.stringify(plugin.settingsManager.getSettings()));
        check('Markdown is unchanged',source === await app.vault.read(file));
        const result={version:plugin.manifest.version,scope:'isolated Windows Obsidian native workbench; no Marketing writes',results,dimensions};
        require('fs').writeFileSync(app.vault.adapter.getBasePath()+'/../native-preview-workspace-result.json',JSON.stringify(result,null,2));
        return JSON.stringify(result);
    } finally {
        root.classList.remove('mp-preview-focused');focus.setAttribute('aria-pressed','false');
        root.querySelector('.mp-validation-details').open=false;
        document.body.className=theme;
        if (originalStyle === null) root.removeAttribute('style');else root.setAttribute('style',originalStyle);
        if (sidebarStyle === null) sidebar.removeAttribute('style');else sidebar.setAttribute('style',sidebarStyle);
        window.dispatchEvent(new Event('resize'));
    }
})()
