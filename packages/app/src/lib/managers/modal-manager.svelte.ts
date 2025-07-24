import type {Snippet} from 'svelte';
import router from '../router';

class ModalManager {
    private view = $state<Snippet | null>(null);

    private history: Snippet[] = [];

    private isOpen = $state(false);

    public open(initialView: Snippet): void {
        console.log('Opening command center');
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        this.view = initialView;
        this.history = [initialView];

        router.action(() => this.handleBack(), true, 'modal');
        console.log('Registered command center action');
    }

    /**
     * Navigates to a new view within the command center.
     * @param view The new view to display
     * @param replaceView Whether to replace the current view in history
     */
    public navigate(view: Snippet, replaceView: boolean = false): void {
        if (!this.isOpen) {
            this.open(view);
            return;
        }

        this.view = view;

        if (replaceView && this.history.length > 0) {
            this.history[this.history.length - 1] = view;
        } else {
            this.history.push(view);

            router.action(() => this.handleBack(), true, 'modal');
        }
    }

    /**
     * Handles back navigation within the command center.
     * @returns true if navigation was handled, false if we should close
     */
    private handleBack(): boolean {
        this.history.pop();

        if (this.history.length > 0) {
            this.view = this.history[this.history.length - 1];
            return true;
        }

        this.close();
        return false;
    }

    public close(): void {
        this.isOpen = false;
        this.view = null;
        this.history = [];

        router.clearByType('modal');
    }

    public getView(): Snippet | null {
        return this.view;
    }

    public getIsOpen(): boolean {
        return this.isOpen;
    }
}

const manager = new ModalManager();
export default manager;
