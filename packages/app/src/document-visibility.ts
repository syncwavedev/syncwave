import {getContext, setContext} from 'svelte';
import {
	AppError,
	EventEmitter,
	type Unsubscribe,
	type VisibilityMonitor,
} from 'syncwave';

const DOCUMENT_VISIBILITY = Symbol('document-visibility');

export class DocumentVisibilityMonitor implements VisibilityMonitor {
	private documentVisibilitySub: () => void;

	constructor() {
		this.documentVisibility = new EventEmitter<'visible' | 'hidden'>();

		const listener = () => {
			this.documentVisibility.emit(document.visibilityState);
		};

		document.addEventListener('visibilitychange', listener, {
			passive: true,
		});
		this.documentVisibilitySub = () => {
			document.removeEventListener('visibilitychange', listener);
		};
	}

	documentVisibility: EventEmitter<'visible' | 'hidden'>;

	get visibility() {
		return document.visibilityState;
	}

	subscribe(
		callback: (visibility: 'visible' | 'hidden') => void
	): Unsubscribe {
		return this.documentVisibility.subscribe(callback);
	}

	close() {
		this.documentVisibility.close();
		this.documentVisibilitySub();
	}
}

export function monitorDocumentVisibility() {
	const documentVisibility = new DocumentVisibilityMonitor();

	setContext(DOCUMENT_VISIBILITY, documentVisibility);
}

export function getDocumentVisibility() {
	const result = getContext<DocumentVisibilityMonitor>(DOCUMENT_VISIBILITY);
	if (!result) {
		throw new AppError("Document visibility monitor isn't setup");
	}
	return result;
}
