import { createSignal } from "solid-js";

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
	duration?: number; // 自动消失时间（毫秒），0 表示不自动消失
};

const [toasts, setToasts] = createSignal<Toast[]>([]);

let toastIdCounter = 0;

const generateId = () => `toast-${++toastIdCounter}-${Date.now()}`;

export const toastStore = {
	get toasts() {
		return toasts();
	},

	add(toast: Omit<Toast, "id">) {
		const id = generateId();
		const newToast: Toast = {
			id,
			duration: 3000, // 默认 3 秒
			...toast,
		};

		setToasts((prev) => [...prev, newToast]);

		// 如果设置了自动消失时间，则自动移除
		if (newToast.duration && newToast.duration > 0) {
			setTimeout(() => {
				toastStore.remove(id);
			}, newToast.duration);
		}

		return id;
	},

	remove(id: string) {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	},

	clear() {
		setToasts([]);
	},
};

// 直接导出 toast 对象，不需要 hooks
export const toast = {
	success: (message: string, duration?: number) => {
		return toastStore.add({ message, type: "success", duration });
	},
	error: (message: string, duration?: number) => {
		return toastStore.add({ message, type: "error", duration });
	},
	info: (message: string, duration?: number) => {
		return toastStore.add({ message, type: "info", duration });
	},
	warning: (message: string, duration?: number) => {
		return toastStore.add({ message, type: "warning", duration });
	},
};
