/**
 * Badge / Tag Component
 */

import { Component, JSX, Show, splitProps } from 'solid-js';
import { XIcon } from './icons';

export interface BadgeProps {
  children: JSX.Element;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  removable?: boolean;
  onRemove?: () => void;
  class?: string;
  color?: string;
  onClick?: () => void;
}

export const Badge: Component<BadgeProps> = (props) => {
  const variant = () => props.variant || 'default';
  const size = () => props.size || 'md';

  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const customColorStyle = () => {
    if (props.color) {
      return {
        'background-color': `${props.color}20`,
        'color': props.color,
        'border-color': `${props.color}40`,
      };
    }
    return {};
  };

  return (
    <span
      class={`
        inline-flex items-center gap-1 
        font-medium rounded-full
        ${props.color ? 'border' : variantStyles[variant()]}
        ${sizeStyles[size()]}
        ${props.onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${props.class || ''}
      `}
      style={customColorStyle()}
      onClick={props.onClick}
    >
      {props.children}
      <Show when={props.removable}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            props.onRemove?.();
          }}
          class="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        >
          <XIcon size={size() === 'sm' ? 10 : size() === 'lg' ? 16 : 12} />
        </button>
      </Show>
    </span>
  );
};

export interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
}

export const TagInput: Component<TagInputProps> = (props) => {
  let inputRef: HTMLInputElement | undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value && !props.tags.includes(value)) {
        if (!props.maxTags || props.tags.length < props.maxTags) {
          props.onAdd(value);
          (e.target as HTMLInputElement).value = '';
        }
      }
    } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) {
      const lastTag = props.tags[props.tags.length - 1];
      if (lastTag) {
        props.onRemove(lastTag);
      }
    }
  };

  return (
    <div class="flex flex-wrap gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[42px]">
      {props.tags.map((tag) => (
        <Badge removable onRemove={() => props.onRemove(tag)} size="sm">
          {tag}
        </Badge>
      ))}
      <input
        ref={inputRef}
        type="text"
        placeholder={props.tags.length === 0 ? props.placeholder || 'Add tags...' : ''}
        onKeyDown={handleKeyDown}
        class="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
      />
    </div>
  );
};

export default Badge;
