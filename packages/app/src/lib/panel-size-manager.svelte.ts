export type PanelType = 'activity' | 'card_details';

export class PanelSizeManager {
    private _panelWidths: Record<PanelType, number | null> = $state({
        activity: null,
        card_details: null,
    });

    private readonly _storagePrefix = 'panel_width_';

    constructor() {
        this.loadAllFromStorage();
    }

    public getWidth(panelType: PanelType): number | null {
        return this._panelWidths[panelType];
    }

    public setWidth(panelType: PanelType, width: number): void {
        if (width <= 0) {
            console.error(`Cannot save invalid panel width for ${panelType}`);
            return;
        }

        this._panelWidths[panelType] = width;
        this.saveToStorage(panelType, width);
    }

    private saveToStorage(panelType: PanelType, width: number): void {
        try {
            localStorage.setItem(
                this._getStorageKey(panelType),
                width.toString()
            );
        } catch (error: unknown) {
            console.error(
                `Failed to save ${panelType} panel width to local storage:`,
                error
            );
        }
    }

    private loadFromStorage(panelType: PanelType): number | null {
        try {
            const savedWidth = localStorage.getItem(
                this._getStorageKey(panelType)
            );
            return savedWidth ? parseInt(savedWidth, 10) : null;
        } catch (error: unknown) {
            console.error(
                `Failed to retrieve ${panelType} panel width from local storage:`,
                error
            );
            return null;
        }
    }

    private loadAllFromStorage(): void {
        for (const panelType in this._panelWidths) {
            const width = this.loadFromStorage(panelType as PanelType);
            if (width !== null) {
                this._panelWidths[panelType as PanelType] = width;
            }
        }
    }

    private _getStorageKey(panelType: PanelType): string {
        return this._storagePrefix + panelType;
    }
}

export const panelSizeManager = new PanelSizeManager();
