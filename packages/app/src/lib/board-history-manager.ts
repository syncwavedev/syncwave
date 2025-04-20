import type {BoardId} from 'syncwave';

class BoardHistoryManager {
    private static readonly STORAGE_KEY = 'board_id';

    /**
     * Saves a board key to local storage
     * @param boardId The key to save
     */
    public static save(boardId: BoardId): void {
        if (!boardId) {
            console.error('Cannot save empty board key');
            return;
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, boardId);
            console.log(`Board key "${boardId}" saved successfully`);
        } catch (error: unknown) {
            console.error('Failed to save board key to local storage:', error);
        }
    }

    /**
     * Retrieves the latest board key from local storage
     * @returns The latest board key or null if none exists
     */
    public static last(): BoardId | null {
        try {
            return localStorage.getItem(this.STORAGE_KEY) as BoardId | null;
        } catch (error: unknown) {
            console.error(
                'Failed to retrieve board key from local storage:',
                error
            );
            return null;
        }
    }

    /**
     * Clears the stored board key
     */
    public static clear(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('Board key cleared successfully');
        } catch (error: unknown) {
            console.error(
                'Failed to clear board key from local storage:',
                error
            );
        }
    }
}

export default BoardHistoryManager;
