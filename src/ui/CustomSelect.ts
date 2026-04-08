/**
 * 可复用的自定义下拉选择器组件
 */

export interface SelectOption {
    label: string;
    value: string;
    header?: boolean;
}

export interface CustomSelectControl {
    container: HTMLElement;
    updateOptions: (newOptions: SelectOption[]) => void;
    setValue: (value: string) => void;
}

export function createCustomSelect(
    parent: HTMLElement,
    className: string,
    initialOptions: SelectOption[],
    onChange: (value: string) => void
): CustomSelectControl {
    const container = parent.createEl('div', { cls: 'custom-select-container' });
    if (className) container.classList.add(className);

    const select = container.createEl('div', { cls: 'custom-select' });
    const selectedText = select.createEl('span', { cls: 'selected-text' });
    select.createEl('span', { cls: 'select-arrow', text: '▾' });

    const dropdown = container.createEl('div', { cls: 'select-dropdown' });

    let currentOptions = initialOptions;
    let currentValue = '';

    const renderOptions = (opts: SelectOption[]) => {
        dropdown.empty();
        opts.forEach(option => {
            if (option.header) {
                dropdown.createEl('div', {
                    cls: 'select-group-header',
                    text: option.label,
                    attr: {
                        style: 'padding: 8px 12px; font-weight: bold; color: var(--text-muted); font-size: 0.8em; background-color: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border); border-top: 1px solid var(--background-modifier-border); pointer-events: none;'
                    }
                });
                return;
            }

            const item = dropdown.createEl('div', {
                cls: 'select-item',
                text: option.label
            });

            item.dataset.value = option.value;
            if (option.value === currentValue) {
                item.classList.add('selected');
            }

            item.addEventListener('click', () => {
                setValue(option.value);
                dropdown.classList.remove('show');
                onChange(option.value);
            });
        });
    };

    const setValue = (value: string) => {
        const option = currentOptions.find(o => o.value === value && !o.header);
        if (option) {
            currentValue = value;
            selectedText.textContent = option.label;
            select.dataset.value = value;

            dropdown.querySelectorAll('.select-item').forEach(el => {
                if ((el as HTMLElement).dataset.value === value) {
                    el.classList.add('selected');
                } else {
                    el.classList.remove('selected');
                }
            });
        }
    };

    renderOptions(currentOptions);

    const firstOption = currentOptions.find(o => !o.header);
    if (firstOption && firstOption.value) {
        setValue(firstOption.value);
    }

    select.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.select-dropdown.show').forEach(el => {
            if (el !== dropdown) el.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });

    return {
        container,
        updateOptions: (newOptions: SelectOption[]) => {
            currentOptions = newOptions;
            renderOptions(newOptions);
            if (currentOptions.length > 0) {
                const exists = currentOptions.find(o => o.value === currentValue && !o.header);
                if (!exists) {
                    const first = currentOptions.find(o => !o.header);
                    if (first) setValue(first.value);
                } else {
                    setValue(currentValue);
                }
            }
        },
        setValue
    };
}
