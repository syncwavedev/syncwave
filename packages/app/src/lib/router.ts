import * as regexparam from 'regexparam';

interface NavItem {
	uri?: string;
	replace?: boolean;
	shallow?: boolean;
	onEscape?: boolean;
	onBack?: () => void;
}

interface Route {
	pattern: RegExp;
	keys: string[];
	handler: (params: Record<string, string | undefined>) => void;
}

interface RouterState {
	shallow?: boolean;
	id: number;
}

class Router {
	private base: string;
	private on404?: (uri: string) => void;
	private routes: Route[] = [];
	private currentUri: string | null = null;
	private rgx: RegExp;
	private id: number = Date.now();
	private navigations: NavItem[] = [];

	constructor(base: string = '', on404?: (uri: string) => void) {
		this.base = '/' + (base || '').replace(/^\/|\/$/g, '');
		this.on404 = on404;
		this.rgx =
			this.base === '/'
				? /^\/+/
				: new RegExp('^\\' + this.base + '(?=\\/|$)\\/?', 'i');

		this.listen();
	}

	/** Formats a URI by ensuring it starts with '/' and respects the base path. */
	public format(uri: string): string {
		if (!uri) return uri;
		uri = '/' + uri.replace(/^\/|\/$/g, '');
		return this.rgx.test(uri) ? uri.replace(this.rgx, '/') : uri;
	}

	public route(
		uri: string,
		options: {
			replace?: boolean;
			shallow?: boolean;
			onEscape?: boolean;
			onBack?: () => void;
		} = {}
	): void {
		const {
			replace = false,
			shallow = false,
			onEscape = false,
			onBack,
		} = options;

		// Prepend base if URI starts with '/' but doesn't match the base
		if (uri[0] === '/' && !this.rgx.test(uri)) {
			uri = this.base + uri;
		}

		this.id = Date.now();
		const state: RouterState = {
			id: this.id,
			shallow,
		};

		const navItem = {uri, replace, shallow, onEscape, onBack};

		if (replace && this.navigations.length > 0) {
			this.navigations[this.navigations.length - 1] = navItem;
		} else {
			this.navigations.push(navItem);
		}

		if (uri === this.currentUri || replace) {
			history.replaceState(state, '', uri);
		} else {
			history.pushState(state, '', uri);
		}
	}

	public action(onBack: () => void, onEscape?: boolean): void {
		this.id = Date.now();
		const state: RouterState = {
			id: this.id,
			shallow: true,
		};

		this.navigations.push({onBack, onEscape});

		history.pushState(state, '', `#${this.id}`);
	}

	public on(
		pattern: string,
		handler: (params: Record<string, string | undefined>) => void
	): this {
		const {pattern: regex, keys} = regexparam.parse(pattern);
		this.routes.push({pattern: regex, keys, handler});
		return this;
	}

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

	private runOnEvent = (e: Event): void => {
		if (e.type === 'popstate') {
			const newState = (e as PopStateEvent).state as RouterState | null;

			if (newState && typeof newState.id === 'number') {
				const direction = newState.id < this.id ? 'back' : 'forward';
				this.id = newState.id;

				if (direction === 'back') {
					const item = this.navigations.pop();
					if (item && item.onBack) {
						item.onBack();
						return;
					}
				}
			}

			this.run();
		} else {
			// For pushstate/replacestate, run only if not shallow
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
			if (topItem.onEscape && topItem.onBack) {
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

		const replace = target.hasAttribute('data-replace');
		const shallow = target.hasAttribute('data-shallow');
		this.route(href, {replace, shallow});
	};

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
			history.replaceState({id: this.id}, '');
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
