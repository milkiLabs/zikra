/**
 * Button Component
 */

import { Component, JSX, splitProps, Show } from 'solid-js';
import { LoaderIcon } from './icons';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: JSX.Element;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'loading',
    'icon',
    'iconPosition',
    'fullWidth',
    'class',
    'children',
    'disabled',
  ]);

  const variant = () => local.variant || 'primary';
  const size = () => local.size || 'md';
  const iconPos = () => local.iconPosition || 'left';

  const baseStyles = `
    inline-flex items-center justify-center gap-2 
    font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantStyles = {
    primary: `
      bg-blue-600 text-white 
      hover:bg-blue-700 active:bg-blue-800
      focus:ring-blue-500
      dark:bg-blue-500 dark:hover:bg-blue-600
    `,
    secondary: `
      bg-gray-100 text-gray-900 
      hover:bg-gray-200 active:bg-gray-300
      focus:ring-gray-500
      dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600
    `,
    ghost: `
      bg-transparent text-gray-600 
      hover:bg-gray-100 active:bg-gray-200
      focus:ring-gray-500
      dark:text-gray-300 dark:hover:bg-gray-800
    `,
    danger: `
      bg-red-600 text-white 
      hover:bg-red-700 active:bg-red-800
      focus:ring-red-500
    `,
    outline: `
      border-2 border-gray-300 bg-transparent text-gray-700
      hover:bg-gray-50 active:bg-gray-100
      focus:ring-gray-500
      dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800
    `,
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      {...rest}
      disabled={local.loading || local.disabled}
      class={`
        ${baseStyles}
        ${variantStyles[variant()]}
        ${sizeStyles[size()]}
        ${local.fullWidth ? 'w-full' : ''}
        ${local.class || ''}
      `}
    >
      <Show when={local.loading}>
        <LoaderIcon size={size() === 'sm' ? 14 : size() === 'lg' ? 22 : 18} />
      </Show>
      <Show when={!local.loading && local.icon && iconPos() === 'left'}>
        {local.icon}
      </Show>
      <Show when={local.children}>
        <span>{local.children}</span>
      </Show>
      <Show when={!local.loading && local.icon && iconPos() === 'right'}>
        {local.icon}
      </Show>
    </button>
  );
};

export default Button;
