import { Notice } from 'obsidian';
export interface SelectOption { label: string; value: string; header?: boolean }
export interface CustomSelectControl { container: HTMLElement; updateOptions(options: SelectOption[]): void; setValue(value: string): void }

/** Native select keeps grouped choices, keyboard navigation and lifecycle without document listeners. */
export function createCustomSelect(parent: HTMLElement, className: string, initialOptions: SelectOption[], onChange: (value: string) => void | Promise<void>): CustomSelectControl {
    const container = parent.createDiv({ cls:`custom-select-container ${className}` });
    const select = container.createEl('select', {cls:'custom-select dropdown',attr:{'aria-label':className.includes('font')?'字体':className.includes('background')?'背景':'局部排版增强'}});
    const updateTitle = () => { select.title = select.selectedOptions[0]?.textContent || ''; };
    const render = (options: SelectOption[]) => {
        const current = select.value;
        select.empty();
        let group: HTMLOptGroupElement | null = null;
        for(const option of options) {
            if(option.header) { group = select.createEl('optgroup',{attr:{label:option.label}}); continue; }
            (group || select).createEl('option',{text:option.label,attr:{value:option.value}});
        }
        if(options.some(option => !option.header && option.value === current)) select.value = current;
        select.dataset.value = select.value;
        updateTitle();
    };
    render(initialOptions);
    select.addEventListener('change',() => {
        const previous=select.dataset.value || ''; const value=select.value;
        select.disabled=true;
        void Promise.resolve().then(() => onChange(value)).then(() => { select.dataset.value=value; }).catch((error: unknown) => {
            select.value=previous; select.dataset.value=previous;
            new Notice(`设置失败：${error instanceof Error ? error.message : String(error)}`);
        }).finally(() => { updateTitle(); select.disabled=false; });
    });
    return {container,updateOptions:render,setValue:value=> {
        if(!Array.from(select.options).some(option=>option.value===value)) select.createEl('option',{text:className.includes('font')?'当前字体':className.includes('background')?'当前背景':'当前增强效果',attr:{value}});
        select.value=value; select.dataset.value=value;
        updateTitle();
    }};
}
