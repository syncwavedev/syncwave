import {parse} from 'regexparam';
import appNavigator from './app-navigator';

// Define the structure of the router state with history tracking
interface RouterState {
	historyLength: number; // Tracks the position in the navigation history
	shallow?: boolean; // Indicates if routing should skip handlers
}

// Define the structure of a route
interface Route {
	pattern: RegExp;
	keys: string[];
	handler: (params: Record<string, string | undefined>) => void;
}

/**
 * A custom router class for managing navigation in a web application.
 * Supports route patterns, shallow routing, history tracking, and proper back/forward handling.
 */
class Router {
	private base: string;
	private on404?: (uri: string) => void;
	private routes: Route[] = [];
	private currentUri: string | null = null;
	private rgx: RegExp;
	private currentHistoryLength: number = 0; // Tracks the current position in history

	/**
	 * Constructs a new Router instance.
	 * @param base The base path for the router (e.g., '/app'). Defaults to ''.
	 * @param on404 Optional callback for handling unmatched routes (404).
	 */
	constructor(base: string = '', on404?: (uri: string) => void) {
		this.base = '/' + (base || '').replace(/^\/|\/$/g, '');
		this.on404 = on404;
		this.rgx =
			this.base === '/'
				? /^\/+/
				: new RegExp('^\\' + this.base + '(?=\\/|$)\\/?', 'i');
	}

	/**
	 * Normalizes a URI by ensuring it starts with '/' and optionally strips the base path.
	 * @param uri The URI to format.
	 * @returns The formatted URI.
	 */
	public format(uri: string): string {
		if (!uri) return uri;
		uri = '/' + uri.replace(/^\/|\/$/g, '');
		return this.rgx.test(uri) ? uri.replace(this.rgx, '/') : uri;
	}

	/**
	 * Navigates to a URI, either by pushing or replacing the history state.
	 * Updates historyLength to track navigation position.
	 * @param uri The URI to navigate to.
	 * @param options Navigation options: replace (use replaceState) and shallow (skip handlers).
	 */
	public route(
		uri: string,
		options: {replace?: boolean; shallow?: boolean} = {}
	): void {
		const {replace = false, shallow = false} = options;

		// Prepend base if URI starts with '/' but doesn't match the base
		if (uri[0] === '/' && !this.rgx.test(uri)) {
			uri = this.base + uri;
		}

		const method =
			(uri === this.currentUri || replace ? 'replace' : 'push') + 'State';
		if (method === 'pushState') {
			this.currentHistoryLength += 1; // Increment for new history entry
		}
		const state: RouterState = {
			historyLength: this.currentHistoryLength,
			shallow,
		};

		if (method === 'pushState') {
			history.pushState(state, '', uri);
		} else {
			history.replaceState(state, '', uri);
		}
	}

	/**
	 * Registers a route with a pattern and handler.
	 * @param pattern The route pattern (e.g., '/user/:id').
	 * @param handler The function to call when the route matches, receiving extracted parameters.
	 * @returns This instance for method chaining.
	 */
	public on(
		pattern: string,
		handler: (params: Record<string, string | undefined>) => void
	): this {
		const {pattern: regex, keys} = parse(pattern);
		this.routes.push({pattern: regex, keys, handler});
		return this;
	}

	/**
	 * Runs the router to match the current URI against registered routes and execute handlers.
	 * @param uri Optional URI to run; defaults to current location.pathname.
	 * @returns This instance for method chaining.
	 */
	public run(uri?: string): this {
		const formattedUri = this.format(uri || location.pathname);
		if (formattedUri) {
			const uriWithoutQuery =
				formattedUri.match(/[^?#]*/)?.at(0) ?? formattedUri;
			this.currentUri = uriWithoutQuery;

			// Clear the app navigator's stack for the new page
			appNavigator.clear();

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

	/**
	 * Handles history events, distinguishing between back and forward navigation.
	 */
	private runOnEvent = (e: Event): void => {
		if (e.type === 'popstate') {
			const newState = (e as PopStateEvent).state as RouterState | null;
			if (newState && typeof newState.historyLength === 'number') {
				const direction =
					newState.historyLength < this.currentHistoryLength
						? 'back'
						: 'forward';
				this.currentHistoryLength = newState.historyLength;
				if (direction === 'back') {
					// Try appNavigator for back navigation within the page
					if (!appNavigator.back()) {
						this.run(); // Fall back to router if appNavigator can't handle it
					}
				} else {
					// Forward navigation: run the router to load the next page
					this.run();
				}
			} else {
				// No state (e.g., initial load or external navigation): run the router
				this.run();
			}
		} else {
			// For pushstate/replacestate, run only if not shallow
			const state = (e as {state?: RouterState}).state;
			if (!state?.shallow) {
				this.run();
			}
		}
	};

	/**
	 * Handles click events to intercept navigation for internal links.
	 */
	private handleClick = (e: MouseEvent): void => {
		const target = (e.target as Element).closest('a');
		if (!target) return;

		const href = target.getAttribute('href');
		if (
			!href ||
			target.hasAttribute('target') ||
			target.host !== location.host ||
			href[0] === '#'
		)
			return;
		if (
			e.ctrlKey ||
			e.metaKey ||
			e.altKey ||
			e.shiftKey ||
			e.button ||
			e.defaultPrevented
		)
			return;

		// Handle relative paths or absolute paths starting with base
		if (href[0] !== '/' || this.rgx.test(href)) {
			e.preventDefault();
			this.route(href);
		}
	};

	/**
	 * Starts listening to history and click events, and initializes the router state.
	 * @returns This instance for method chaining.
	 */
	public listen(): this {
		this.wrapHistoryMethod('push');
		this.wrapHistoryMethod('replace');
		window.addEventListener('popstate', this.runOnEvent);
		window.addEventListener('pushstate', this.runOnEvent);
		window.addEventListener('replacestate', this.runOnEvent);
		window.addEventListener('click', this.handleClick);
		this.run();

		// Set initial state if none exists (e.g., on page load)
		if (!history.state) {
			this.currentHistoryLength = 1;
			history.replaceState({historyLength: 1, shallow: false}, '');
		}
		return this;
	}

	/**
	 * Stops listening to history and click events.
	 */
	public unlisten(): void {
		window.removeEventListener('popstate', this.runOnEvent);
		window.removeEventListener('pushstate', this.runOnEvent);
		window.removeEventListener('replacestate', this.runOnEvent);
		window.removeEventListener('click', this.handleClick);
	}

	/**
	 * Wraps a history method (pushState or replaceState) to dispatch custom events.
	 * @param type The type of history method ('push' or 'replace').
	 */
	private wrapHistoryMethod(type: 'push' | 'replace'): void {
		const method = `${type}State` as 'pushState' | 'replaceState';
		const original = history[method].bind(history) as (
			state: RouterState,
			title: string,
			url?: string | null
		) => void;

		history[method] = function (
			this: History,
			state: RouterState,
			title: string,
			url?: string | null
		): void {
			const event = new Event(`${type.toLowerCase()}state`);
			Object.defineProperty(event, 'state', {value: state});
			original.call(this, state, title, url);
			window.dispatchEvent(event);
		};
	}
}

export default new Router();
