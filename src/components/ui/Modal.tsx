/**
 * Modal Component
 */

import { Component, JSX, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { XIcon } from './icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export const Modal: Component<ModalProps> = (props) => {
  const size = () => props.size || 'md';
  const showClose = () => props.showClose !== false;
  const closeOnBackdrop = () => props.closeOnBackdrop !== false;
  const closeOnEscape = () => props.closeOnEscape !== false;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  // Handle escape key
  createEffect(() => {
    if (!props.open || !closeOnEscape()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  // Lock body scroll when modal is open
  createEffect(() => {
    if (props.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (closeOnBackdrop() && e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleBackdropClick}
        >
          <div
            class={`
              ${sizeStyles[size()]}
              w-full bg-white dark:bg-gray-800 
              rounded-xl shadow-2xl
              animate-slide-up
              max-h-[90vh] overflow-hidden
              flex flex-col
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <Show when={props.title || showClose()}>
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Show when={props.title}>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {props.title}
                  </h2>
                </Show>
                <Show when={showClose()}>
                  <button
                    onClick={props.onClose}
                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XIcon size={20} />
                  </button>
                </Show>
              </div>
            </Show>

            {/* Content */}
            <div class="flex-1 overflow-y-auto px-6 py-4">
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default Modal;
