/* UI-only regression: explicitly target MPPreview-Refactor-Test with Obsidian CLI eval. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing to test a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'];
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0]?.view;
    if (!plugin || !view) throw new Error('Open the isolated plugin preview first');
    const root = view.containerEl.querySelector('.mp-view-content');
    const toolbar = root.querySelector('.mp-toolbar');
    const sidebar = app.workspace.rightSplit.containerEl;
    const originalStyle = sidebar.getAttribute('style');
    const originalTheme = document.body.className;
    const originalSettings = plugin.settingsManager.getSettings();
    const sourceFile = app.vault.getAbstractFileByPath('Regression.md');
    const source = await app.vault.read(sourceFile);
    const results = [];
    const check = (name, pass, detail = null) => {
        results.push({name, pass: Boolean(pass), detail});
        if (!pass) throw new Error(name + ': ' + JSON.stringify(detail));
    };
    const dimensions = [];
    const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
    const advanced = toolbar.querySelector('.mp-advanced-typesetting');
    const explanation = toolbar.querySelector('.mp-enhancement-help');
    try {
        await view.onFileOpen(sourceFile);
        check('more tools and explanation initially collapsed', !advanced.open && !explanation.open);
        const controls = toolbar.querySelector('.mp-compact-controls');
        check('appearance order is gallery background font size', [...controls.children].map(el=>el.className).join('|') === 'mp-gallery-btn|mp-toolbar-field mp-background-field|mp-toolbar-field mp-font-field|mp-toolbar-field mp-size-field');
        check('all nine secondary actions remain available', toolbar.querySelectorAll('.mp-secondary-row > button').length === 9);
        check('two sections describe tools and local enhancement', [...advanced.querySelectorAll('h3')].map(el=>el.textContent).join('|') === '文章操作|局部排版增强');
        const recipeSelect = toolbar.querySelector('.mp-recipe-select select');
        check('effect selector has new accessible name', recipeSelect.getAttribute('aria-label') === '局部排版增强');
        check('all six effect labels and old IDs remain', [...recipeSelect.options].map(el=>[el.value,el.textContent].join(':')).join('|') === 'legacy-compatible:不额外增强|tutorial:步骤列表|checklist:勾选清单|product-intro:导语强调|commentary:引用与结语强调|review:小标题强调');
        advanced.open = true;
        for (const theme of ['theme-light','theme-dark']) {
            document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(theme);
            for (const width of [320,375,414,469,520,600,900]) {
                sidebar.style.width = width + 'px';await delay(150);
                const fields = [...controls.children];
                const rows = [...new Set(fields.map(el=>Math.round(el.getBoundingClientRect().top)))];
                const bounds = toolbar.getBoundingClientRect();
                const overflow = [...toolbar.querySelectorAll('button,select,input,summary')].filter(el=>{
                    const box=el.getBoundingClientRect();return box.width>0 && (box.left<bounds.left-1 || box.right>bounds.right+1);
                }).map(el=>el.getAttribute('aria-label') || el.textContent);
                dimensions.push({theme,width,paneWidth:view.containerEl.clientWidth,rows:rows.length,overflow});
                check(theme+' controls fit '+width, overflow.length === 0, overflow);
                if (width >= 520) check(theme+' appearance uses one row '+width, rows.length === 1, rows);
                if (width === 375 || width === 414) check(theme+' narrow appearance uses two rows '+width, rows.length === 2, rows);
            }
        }
        recipeSelect.value = 'tutorial';recipeSelect.dispatchEvent(new Event('change'));
        await delay(150);
        check('active enhancement is visible on collapsed entry', advanced.firstElementChild.textContent === '更多工具 · 步骤列表' && plugin.settingsManager.getSettings().v3.selectedRecipeId === 'tutorial');
        advanced.open=false;
        check('collapsing more tools does not disable the effect', root.querySelectorAll('.mp-recipe-step-label').length > 0);
        explanation.open=true;advanced.open=true;
        check('explanation is available on demand', explanation.textContent.includes('不修改 Markdown 原文'));
        recipeSelect.value='legacy-compatible';recipeSelect.dispatchEvent(new Event('change'));await delay(150);
        check('no additional enhancement removes effect labels', root.querySelectorAll('.mp-recipe-step-label').length === 0 && advanced.firstElementChild.textContent === '更多工具');
        check('source remains unchanged', await app.vault.read(sourceFile) === source);
        return JSON.stringify({scope:'isolated native UI release candidate; BRAT installation not tested',version:plugin.manifest.version,host:app.version || 'Obsidian',results,dimensions});
    } finally {
        await plugin.settingsManager.updateSettings(originalSettings);
        view.recipeSelect.setValue(originalSettings.v3.selectedRecipeId);
        view.updateRecipeSummary(originalSettings.v3.selectedRecipeId);
        view.applyPresentation(view.previewEl);
        advanced.open=false;explanation.open=false;
        document.body.className=originalTheme;
        if(originalStyle === null) sidebar.removeAttribute('style');else sidebar.setAttribute('style',originalStyle);
    }
})()
