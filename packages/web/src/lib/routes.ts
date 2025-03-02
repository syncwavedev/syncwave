export function getBoardRoute(key: string) {
	return `/app/b/${key}`;
}

export function getCardRoute(boardKey: string, counter: number) {
	return `/app/b/${boardKey}/cards/${counter}`;
}

export function getAppRoute() {
	return '/app';
}
