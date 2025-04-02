export function createThemeManager() {
	let userTheme = $state('system');
	let systemTheme = $state('light');
	const theme = $derived(userTheme === 'system' ? systemTheme : userTheme);

	function setUserTheme(newTheme: 'light' | 'dark' | 'system') {
		userTheme = newTheme;
	}

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme) {
				userTheme = savedTheme as 'light' | 'dark' | 'system';
			}
		}
	});

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', userTheme);
		}
	});

	$effect(() => {
		if (typeof window !== 'undefined') {
			const prefersLight = window.matchMedia(
				'(prefers-color-scheme: light)'
			);
			systemTheme = prefersLight.matches ? 'light' : 'dark';

			const listener = (event: MediaQueryListEvent) => {
				systemTheme = event.matches ? 'light' : 'dark';
			};
			prefersLight.addEventListener('change', listener);

			return () => {
				prefersLight.removeEventListener('change', listener);
			};
		}

		return () => {};
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', theme);
		}
	});

	return {
		getTheme: () => theme,
		setUserTheme,
	};
}
