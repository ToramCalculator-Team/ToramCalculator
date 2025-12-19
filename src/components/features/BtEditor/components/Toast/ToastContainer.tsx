import { Component, For } from 'solid-js';
import { toastStore } from '../../stores/toastStore';
import { Toast } from './Toast';

const ToastContainer: Component = () => {
  const toasts = () => toastStore.toasts;

  return (
    <div
      class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <For each={toasts()}>
        {(toast) => (
          <div class="pointer-events-auto">
            <Toast
              toast={toast}
              onClose={() => toastStore.remove(toast.id)}
            />
          </div>
        )}
      </For>
    </div>
  );
};

export { ToastContainer };

