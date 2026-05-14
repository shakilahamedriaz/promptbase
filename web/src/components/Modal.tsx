import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  hideClose?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, description, size = 'md', children, footer, hideClose = false }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className={clsx('w-full rounded-[16px] border bg-white shadow-xl', sizeClasses[size])} style={{ borderColor: 'var(--color-border)' }}>
                {(title || !hideClose) && (
                  <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      {title && <Dialog.Title className="text-base font-semibold text-gray-900">{title}</Dialog.Title>}
                      {description && <Dialog.Description className="mt-0.5 text-sm text-gray-500">{description}</Dialog.Description>}
                    </div>
                    {!hideClose && (
                      <button onClick={onClose} className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" aria-label="Close">
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="px-6 py-5">{children}</div>
                {footer && (
                  <div className="flex items-center justify-end gap-3 border-t px-6 py-4 rounded-b-[16px]" style={{ borderColor: 'var(--color-border)', background: 'var(--color-sidebar)' }}>
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
