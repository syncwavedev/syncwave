/**
 * Represents an item in the navigation stack.
 */
export interface NavigatorItem {
  /** Function to call when navigating back from this item. */
  onBack: () => void;
  /** Indicates if this item should handle escape key presses. */
  onEscape: boolean;
}

/**
 * Defines the public API for the navigator.
 */
export interface NavigatorAPI {
  /**
   * Adds a new item to the top of the navigation stack.
   * @param item - The navigation item to push.
   */
  push: (item: NavigatorItem) => void;

  /**
   * Removes and executes the onBack function of the top item in the stack.
   * @returns `true` if an item was popped and its onBack was called, `false` otherwise.
   */
  back: () => boolean;

  /**
   * Replaces the top item in the stack with a new item. If the stack is empty, pushes the item.
   * @param item - The new navigation item to replace the top item.
   */
  replace: (item: NavigatorItem) => void;

  /**
   * Retrieves the top item in the stack without removing it.
   * @returns The top item, or `undefined` if the stack is empty.
   */
  peek: () => NavigatorItem | undefined;

  /**
   * The current number of items in the navigation stack.
   */
  readonly length: number;

  /**
   * Removes all items from the navigation stack.
   */
  clear: () => void;
}

/**
 * Creates a new navigator instance for managing a stack-based navigation history.
 * @returns A navigator object implementing the NavigatorAPI.
 */
const createNavigator = (): NavigatorAPI => {
  // Private stack to store navigation items
  const history: NavigatorItem[] = [];

  return {
    push: (item: NavigatorItem): void => {
      history.push(item);
    },

    back: (): boolean => {
      if (history.length > 0) {
        const item = history.pop();
        if (item) {
          item.onBack();
          return true;
        }
      }
      return false;
    },

    replace: (item: NavigatorItem): void => {
      if (history.length > 0) {
        history[history.length - 1] = item;
      } else {
        history.push(item);
      }
    },

    peek: (): NavigatorItem | undefined => history[history.length - 1],

    get length(): number {
      return history.length;
    },

    clear: (): void => {
      history.length = 0; // Efficiently clears the array in place
    },
  };
};

// Export a singleton instance of the navigator
export default createNavigator();
