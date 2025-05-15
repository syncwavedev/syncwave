export type ToastLevel = 'info' | 'warning' | 'error';

export interface Toast {
    id: string;
    header: string;
    caption: string;
    level: ToastLevel;
    createdAt: number;
}

export interface ToastOptions {
    duration?: number;
}

export class ToastManager {
    private toasts: Toast[] = $state([]);
    private timeoutIds: Map<string, number> = new Map();

    private defaultDuration = 3000;
    private maxToasts = 5;

    public getToasts(): readonly Toast[] {
        return this.toasts;
    }

    public info(
        header: string,
        caption: string,
        options?: ToastOptions
    ): string {
        return this.add(header, caption, 'info', options);
    }

    public warn(
        header: string,
        caption: string,
        options?: ToastOptions
    ): string {
        return this.add(header, caption, 'warning', options);
    }

    public error(
        header: string,
        caption: string,
        options?: ToastOptions
    ): string {
        return this.add(header, caption, 'error', options);
    }

    public remove(id: string): boolean {
        const index = this.toasts.findIndex(toast => toast.id === id);
        if (index === -1) return false;

        const timeoutId = this.timeoutIds.get(id);
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            this.timeoutIds.delete(id);
        }

        this.toasts.splice(index, 1);
        return true;
    }

    public clearAll(): void {
        this.timeoutIds.forEach(id => clearTimeout(id));
        this.timeoutIds.clear();

        this.toasts = [];
    }

    private add(
        header: string,
        caption: string,
        level: ToastLevel,
        options?: ToastOptions
    ): string {
        const id = this.generateId();

        const toast: Toast = {
            id,
            header: header.trim(),
            caption: caption.trim(),
            level,
            createdAt: Date.now(),
        };

        if (this.toasts.length >= this.maxToasts) {
            const oldestToast = this.toasts[0];
            this.remove(oldestToast.id);
        }

        this.toasts.push(toast);

        const duration = options?.duration ?? this.defaultDuration;
        const timeoutId = window.setTimeout(() => {
            this.remove(id);
        }, duration);

        this.timeoutIds.set(id, timeoutId);

        return id;
    }

    private generateId(): string {
        return `toast-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    }
}

export const toastManager = new ToastManager();
