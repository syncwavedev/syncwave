class PanelSizeManager {
	private static readonly LEFT_PANEL_KEY = 'left_panel_width';
	private static readonly RIGHT_PANEL_KEY = 'right_panel_width';

	/**
	 * Saves a panel width to local storage
	 * @param panelSide The panel side ('left' or 'right')
	 * @param width The width to save in pixels
	 */
	public static saveWidth(panelSide: 'left' | 'right', width: number): void {
		if (width <= 0) {
			console.error('Cannot save invalid panel width');
			return;
		}

		const storageKey =
			panelSide === 'left' ? this.LEFT_PANEL_KEY : this.RIGHT_PANEL_KEY;

		try {
			localStorage.setItem(storageKey, width.toString());
		} catch (error: unknown) {
			console.error(
				`Failed to save ${panelSide} panel width to local storage:`,
				error
			);
		}
	}

	/**
	 * Retrieves the saved width for a panel
	 * @param panelSide The panel side ('left' or 'right')
	 * @returns The saved width in pixels or null if none exists
	 */
	public static getWidth(panelSide: 'left' | 'right'): number | null {
		const storageKey =
			panelSide === 'left' ? this.LEFT_PANEL_KEY : this.RIGHT_PANEL_KEY;

		try {
			const savedWidth = localStorage.getItem(storageKey);
			return savedWidth ? parseInt(savedWidth, 10) : null;
		} catch (error: unknown) {
			console.error(
				`Failed to retrieve ${panelSide} panel width from local storage:`,
				error
			);
			return null;
		}
	}

	/**
	 * Resets the panel width to default by removing the stored value
	 * @param panelSide The panel side ('left' or 'right')
	 */
	public static resetWidth(panelSide: 'left' | 'right'): void {
		const storageKey =
			panelSide === 'left' ? this.LEFT_PANEL_KEY : this.RIGHT_PANEL_KEY;

		try {
			localStorage.removeItem(storageKey);
		} catch (error: unknown) {
			console.error(
				`Failed to reset ${panelSide} panel width in local storage:`,
				error
			);
		}
	}
}

export default PanelSizeManager;
