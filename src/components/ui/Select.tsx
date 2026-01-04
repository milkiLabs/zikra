/**
 * Select/Dropdown Component
 */

import { 
  Component, 
  JSX, 
  Show, 
  For, 
  createSignal, 
  createEffect, 
  onCleanup 
} from 'solid-js';
import { ChevronDownIcon, CheckIcon, XIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
  icon?: JSX.Element;
  color?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  label?: string;
  error?: string;
  fullWidth?: boolean;
  class?: string;
  createOption?: (input: string) => SelectOption | null;
}

export const Select: Component<SelectProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  let containerRef: HTMLDivElement | undefined;

  // Close on outside click
  createEffect(() => {
    if (!isOpen()) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  });

  const selectedValues = () => {
    if (!props.value) return [];
    return Array.isArray(props.value) ? props.value : [props.value];
  };

  const selectedOptions = () => {
    return props.options.filter((opt) => selectedValues().includes(opt.value));
  };

  const filteredOptions = () => {
    const term = search().toLowerCase();
    if (!term) return props.options;
    return props.options.filter((opt) => 
      opt.label.toLowerCase().includes(term)
    );
  };

  const toggleOption = (option: SelectOption) => {
    if (props.multiple) {
      const current = selectedValues();
      const newValue = current.includes(option.value)
        ? current.filter((v) => v !== option.value)
        : [...current, option.value];
      props.onChange(newValue);
    } else {
      props.onChange(option.value);
      setIsOpen(false);
    }
  };

  const clear = (e: MouseEvent) => {
    e.stopPropagation();
    props.onChange(props.multiple ? [] : '');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && props.createOption && search()) {
      const newOption = props.createOption(search());
      if (newOption) {
        toggleOption(newOption);
        setSearch('');
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      class={`relative ${props.fullWidth ? 'w-full' : ''} ${props.class || ''}`}
    >
      <Show when={props.label}>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {props.label}
        </label>
      </Show>

      {/* Trigger */}
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setIsOpen(!isOpen())}
        class={`
          w-full px-4 py-2 
          flex items-center justify-between gap-2
          bg-white dark:bg-gray-800
          border rounded-lg
          text-left
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${props.error 
            ? 'border-red-500' 
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
      >
        <span class="flex-1 truncate">
          <Show 
            when={selectedOptions().length > 0}
            fallback={
              <span class="text-gray-400">{props.placeholder || 'Select...'}</span>
            }
          >
            <Show 
              when={props.multiple}
              fallback={selectedOptions()[0]?.label}
            >
              <span class="flex flex-wrap gap-1">
                <For each={selectedOptions()}>
                  {(opt) => (
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {opt.label}
                    </span>
                  )}
                </For>
              </span>
            </Show>
          </Show>
        </span>

        <div class="flex items-center gap-1">
          <Show when={props.clearable && selectedValues().length > 0}>
            <span
              onClick={clear}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <XIcon size={14} />
            </span>
          </Show>
          <ChevronDownIcon 
            size={18} 
            class={`transition-transform ${isOpen() ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <Show when={props.searchable}>
            <div class="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search..."
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                class="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Show>

          {/* Options */}
          <div class="max-h-48 overflow-y-auto">
            <For 
              each={filteredOptions()}
              fallback={
                <div class="px-4 py-3 text-sm text-gray-500 text-center">
                  <Show 
                    when={props.createOption && search()}
                    fallback="No options"
                  >
                    Press Enter to create "{search()}"
                  </Show>
                </div>
              }
            >
              {(option) => (
                <button
                  type="button"
                  onClick={() => toggleOption(option)}
                  class={`
                    w-full px-4 py-2 
                    flex items-center gap-2
                    text-left text-sm
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    transition-colors
                    ${selectedValues().includes(option.value) 
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <Show when={option.icon}>
                    {option.icon}
                  </Show>
                  <Show when={option.color}>
                    <span 
                      class="w-3 h-3 rounded-full" 
                      style={{ 'background-color': option.color }}
                    />
                  </Show>
                  <span class="flex-1">{option.label}</span>
                  <Show when={selectedValues().includes(option.value)}>
                    <CheckIcon size={16} />
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={props.error}>
        <p class="mt-1 text-sm text-red-500">{props.error}</p>
      </Show>
    </div>
  );
};

export default Select;
