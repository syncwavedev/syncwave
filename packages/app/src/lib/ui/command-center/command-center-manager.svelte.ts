import type {Snippet} from 'svelte';
import router from '../../router';

export class CommandCenterManager {
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

        router.action(() => this.handleBack(), true, 'command-center');
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
            // Replace the current view in history
            this.history[this.history.length - 1] = view;
        } else {
            // Add new view to history
            this.history.push(view);

            // Register navigation in router for back button support
            router.action(() => this.handleBack(), true, 'command-center');
        }
    }

    /**
     * Handles back navigation within the command center.
     * @returns true if navigation was handled, false if we should close
     */
    private handleBack(): boolean {
        // Remove current view
        this.history.pop();

        // If we have previous views, show the last one
        if (this.history.length > 0) {
            this.view = this.history[this.history.length - 1];
            return true;
        }

        // No more views, close the command center
        this.close();
        return false;
    }

    /**
     * Closes the command center.
     */
    public close(): void {
        this.isOpen = false;
        this.view = null;
        this.history = [];

        router.clearByType('command-center');
    }

    /**
     * Gets the current view in the command center.
     */
    public getView(): Snippet | null {
        return this.view;
    }

    /**
     * Checks if the command center is currently open.
     */
    public getIsOpen(): boolean {
        return this.isOpen;
    }

    /**
     * Handles keyboard shortcuts for the command center.
     * Call this from a global keyboard event handler.
     */
    public handleKeydown(event: KeyboardEvent): void {
        // Command+K to open command center with default view
        if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            // This would require a defaultView to be set or passed
            // this.open(this.defaultView);
        }
    }
}

export const commandCenter = new CommandCenterManager();
