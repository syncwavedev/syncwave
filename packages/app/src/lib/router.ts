import * as regexparam from 'regexparam';

// Define the NavigatorItem interface
interface NavigatorItem {
	onBack?: () => void;
	uri?: string;
	replace?: boolean;
	shallow?: boolean;
}

// Interface for registered routes
interface Route {
	pattern: RegExp;
	keys: string[];
	handler: (params: Record<string, string | undefined>) => void;
}

// Interface for history state (no navigatorItem)
interface RouterState {
	historyLength: number;
	shallow?: boolean;
	id: number;
}

class Router {
	private base: string;
	private on404?: (uri: string) => void;
	private routes: Route[] = [];
	private currentUri: string | null = null;
	private rgx: RegExp;
	private currentHistoryLength: number = 0;
	private id: number = Date.now();
	private navigations: NavigatorItem[] = []; // Navigation stack

	constructor(base: string = '', on404?: (uri: string) => void) {
		this.base = '/' + (base || '').replace(/^\/|\/$/g, '');
		this.on404 = on404;
		this.rgx =
			this.base === '/'
				? /^\/+/
				: new RegExp('^\\' + this.base + '(?=\\/|$)\\/?', 'i');
	}

	/** Formats a URI by ensuring it starts with '/' and respects the base path. */
	public format(uri: string): string {
		if (!uri) return uri;
		uri = '/' + uri.replace(/^\/|\/$/g, '');
		return this.rgx.test(uri) ? uri.replace(this.rgx, '/') : uri;
	}

	/** Navigates to a URI using the provided NavigatorItem. */
	public navigate(item: NavigatorItem): void {
		const {uri, replace = false, shallow = false} = item;
		const formattedUri = this.format(uri || location.pathname);

		if (formattedUri) {
			const method = replace ? 'replaceState' : 'pushState';
			if (method === 'pushState') {
				this.navigations.push(item);
				this.currentHistoryLength += 1;
			} else {
				if (this.navigations.length > 0) {
					this.navigations[this.navigations.length - 1] = item;
				} else {
					this.navigations.push(item);
				}
			}

			const state: RouterState = {
				historyLength: this.currentHistoryLength,
				shallow,
				id: this.id,
			};

			history[method](state, '', formattedUri);

			if (!shallow && uri) {
				this.run(formattedUri);
			}
		}
	}

	/** Registers a route with a pattern and handler. */
	public on(
		pattern: string,
		handler: (params: Record<string, string | undefined>) => void
	): this {
		const {pattern: regex, keys} = regexparam.parse(pattern);
		this.routes.push({pattern: regex, keys, handler});
		return this;
	}

	/** Matches a URI to a route and runs its handler. */
	public run(uri?: string): this {
		const formattedUri = this.format(uri || location.pathname);
		if (formattedUri) {
			const uriWithoutQuery = formattedUri.match(/[^?#]*/)?.[0] ?? formattedUri;
			this.currentUri = uriWithoutQuery;

			for (const route of this.routes) {
				const match = route.pattern.exec(uriWithoutQuery);
				if (match) {
					const params: Record<string, string | undefined> = {};
					for (let i = 0; i < route.keys.length; i++) {
						params[route.keys[i]] = match[i + 1];
					}
					route.handler(params);
					return this;
				}
			}

			if (this.on404) {
				this.on404(uriWithoutQuery);
			}
		}
		return this;
	}

	/** Handles navigation events like popstate. */
	private runOnEvent = (e: Event): void => {
		if (e.type === 'popstate') {
			const newState = (e as PopStateEvent).state as RouterState | null;

			if (!newState || newState.id !== this.id) {
				history.replaceState(
					{historyLength: this.currentHistoryLength, id: this.id},
					''
				);
				this.run();
				return;
			}

			const direction =
				newState.historyLength < this.currentHistoryLength ? 'back' : 'forward';
			this.currentHistoryLength = newState.historyLength;

			console.log('Direction:', direction);
			console.log('Current history length:', this.currentHistoryLength);
			console.log('New state:', newState);

			if (direction === 'back' && this.navigations.length > 0) {
				const item = this.navigations.pop();
				if (item?.onBack) {
					item.onBack();
					return;
				}
			}
			this.run();
		} else {
			const state = (e as {state?: RouterState}).state;
			if (!state?.shallow) {
				this.run();
			}
		}
	};

	/** Handles the Escape key based on the top NavigatorItem. */
	private handleKeydown = (e: KeyboardEvent): void => {
		if (e.key === 'Escape' && this.navigations.length > 0) {
			const topItem = this.navigations[this.navigations.length - 1];
			if (topItem.onBack) {
				e.preventDefault();
				history.back();
			}
		}
	};

	/** Intercepts clicks on internal links for navigation. */
	private handleClick = (e: MouseEvent): void => {
		const target = (e.target as Element).closest('a');
		if (
			!target ||
			target.hasAttribute('target') ||
			target.host !== location.host ||
			e.defaultPrevented
		) {
			return;
		}

		const href = target.getAttribute('href');
		if (!href || href[0] === '#') return;

		e.preventDefault();
		const navigatorItem: NavigatorItem = {
			uri: href,
			replace: target.hasAttribute('data-replace'),
			shallow: target.hasAttribute('data-shallow'),
		};
		this.navigate(navigatorItem);
	};

	/** Starts listening to navigation events. */
	public listen(): this {
		this.wrapHistoryMethod('push');
		this.wrapHistoryMethod('replace');
		window.addEventListener('popstate', this.runOnEvent);
		window.addEventListener('pushstate', this.runOnEvent);
		window.addEventListener('replacestate', this.runOnEvent);
		window.addEventListener('click', this.handleClick);
		window.addEventListener('keydown', this.handleKeydown);
		this.run();

		if (!history.state) {
			this.currentHistoryLength = 1;
			history.replaceState({historyLength: 1, id: this.id}, '');
		}
		return this;
	}

	/** Stops listening to navigation events. */
	public unlisten(): void {
		window.removeEventListener('popstate', this.runOnEvent);
		window.removeEventListener('pushstate', this.runOnEvent);
		window.removeEventListener('replacestate', this.runOnEvent);
		window.removeEventListener('click', this.handleClick);
		window.removeEventListener('keydown', this.handleKeydown);
	}

	/** Wraps history methods to dispatch custom events. */
	private wrapHistoryMethod(type: 'push' | 'replace'): void {
		const method = `${type}State` as 'pushState' | 'replaceState';
		const original = history[method].bind(history);

		history[method] = (
			state: RouterState,
			title: string,
			url?: string | null
		): void => {
			const event = new Event(`${type.toLowerCase()}state`);
			Object.defineProperty(event, 'state', {value: state});
			original(state, title, url);
			window.dispatchEvent(event);
		};
	}
}

const router = new Router();
export default router;
