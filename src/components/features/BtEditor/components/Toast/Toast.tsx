import { Component } from 'solid-js';
import { Toast as ToastType } from '../../stores/toastStore';

export type ToastProps = {
  toast: ToastType;
  onClose: () => void;
};

const Toast: Component<ToastProps> = (props) => {
  const typeClasses = () => {
    const type = props.toast.type;
    if (type === 'error') {
      return 'bg-fire/90 text-white border-l-4 border-fire';
    } else if (type === 'warning') {
      return 'bg-earth/90 text-white border-l-4 border-earth';
    } else if (type === 'success') {
      return 'bg-wind/90 text-white border-l-4 border-wind';
    }
    return 'bg-water/90 text-white border-l-4 border-water';
  };

  const icon = () => {
    const type = props.toast.type;
    if (type === 'error') {
      return '❌';
    } else if (type === 'warning') {
      return '⚠️';
    } else if (type === 'success') {
      return '✅';
    }
    return 'ℹ️';
  };

  return (
    <div
      class={`flex items-center gap-3 p-4 rounded shadow-lg min-w-[300px] max-w-[500px] ${typeClasses()} animate-slide-in-right`}
      role="alert"
    >
      <span class="text-xl shrink-0">{icon()}</span>
      <p class="flex-1 text-sm font-medium">{props.toast.message}</p>
      <button
        onClick={props.onClose}
        class="shrink-0 text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <span class="text-xl">×</span>
      </button>
    </div>
  );
};

export { Toast };

