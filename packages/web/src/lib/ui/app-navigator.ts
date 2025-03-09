export interface NavigatorItem {
	onBack: () => void;
	onEscape: boolean;
}

/**
 * Singleton class to manage a stack-based navigation history.
 */
class Navigator {
	/** Internal history stack storing navigation items. */
	private history: NavigatorItem[];

	constructor() {
		this.history = [];
	}

	/**
	 * Pushes a new item onto the history stack.
	 * @param item - The navigation item to add.
	 */
	push(item: NavigatorItem): void {
		this.history.push(item);
	}

	/**
	 * Pops the top item from the history stack and calls its onBack function.
	 * @returns True if an item was popped and onBack was called, false otherwise.
	 */
	back(): boolean {
		if (this.history.length > 0) {
			const item = this.history.pop();
			if (item) {
				item.onBack();
				return true;
			}
		}
		return false;
	}

	/**
	 * Replaces the top item in the history stack with a new item.
	 * If the history is empty, pushes the item instead.
	 * @param item - The new navigation item to replace the top item.
	 */
	replace(item: NavigatorItem): void {
		if (this.history.length > 0) {
			this.history[this.history.length - 1] = item;
		} else {
			this.push(item);
		}
	}

	/**
	 * Returns the top item in the history stack without removing it.
	 * @returns The top navigation item, or undefined if the history is empty.
	 */
	peek(): NavigatorItem | undefined {
		return this.history[this.history.length - 1];
	}

	/**
	 * Gets the current number of items in the history stack.
	 */
	get length(): number {
		return this.history.length;
	}

	/**
	 * Clears the entire history stack.
	 * Use with caution, as it removes all navigation history.
	 */
	clear(): void {
		this.history = [];
	}
}

export default new Navigator();
