/**
 * Input Components
 */

import { Component, JSX, splitProps, Show, createSignal } from 'solid-js';
import { XIcon } from './icons';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: JSX.Element;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const Input: Component<InputProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'icon',
    'clearable',
    'onClear',
    'fullWidth',
    'class',
    'value',
  ]);

  const baseStyles = `
    w-full px-4 py-2 
    bg-white dark:bg-gray-800
    border border-gray-300 dark:border-gray-600
    rounded-lg
    text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    transition-colors duration-200
  `;

  const errorStyles = `
    border-red-500 focus:ring-red-500
  `;

  const withIconStyles = 'pl-10';
  const withClearStyles = 'pr-10';

  return (
    <div class={`${local.fullWidth ? 'w-full' : ''}`}>
      <Show when={local.label}>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {local.label}
        </label>
      </Show>
      
      <div class="relative">
        <Show when={local.icon}>
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {local.icon}
          </div>
        </Show>
        
        <input
          {...rest}
          value={local.value}
          class={`
            ${baseStyles}
            ${local.error ? errorStyles : ''}
            ${local.icon ? withIconStyles : ''}
            ${local.clearable && local.value ? withClearStyles : ''}
            ${local.class || ''}
          `}
        />
        
        <Show when={local.clearable && local.value}>
          <button
            type="button"
            onClick={local.onClear}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon size={16} />
          </button>
        </Show>
      </div>
      
      <Show when={local.error}>
        <p class="mt-1 text-sm text-red-500">{local.error}</p>
      </Show>
      
      <Show when={local.hint && !local.error}>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{local.hint}</p>
      </Show>
    </div>
  );
};

export interface TextAreaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const TextArea: Component<TextAreaProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'fullWidth',
    'class',
  ]);

  const baseStyles = `
    w-full px-4 py-2 
    bg-white dark:bg-gray-800
    border border-gray-300 dark:border-gray-600
    rounded-lg
    text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    transition-colors duration-200
    resize-y min-h-[100px]
  `;

  return (
    <div class={`${local.fullWidth ? 'w-full' : ''}`}>
      <Show when={local.label}>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {local.label}
        </label>
      </Show>
      
      <textarea
        {...rest}
        class={`
          ${baseStyles}
          ${local.error ? 'border-red-500 focus:ring-red-500' : ''}
          ${local.class || ''}
        `}
      />
      
      <Show when={local.error}>
        <p class="mt-1 text-sm text-red-500">{local.error}</p>
      </Show>
      
      <Show when={local.hint && !local.error}>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{local.hint}</p>
      </Show>
    </div>
  );
};

export default Input;
