import { PUBLIC_STAGE } from '$env/static/public';

export interface AppConfig {
	googleClientId: string;
	apiUrl: string;
	serverWsUrl: string;
}

// wss://api-ground-dev.edme.io:443
export const appConfig: AppConfig = (() => {
	console.log('hello', PUBLIC_STAGE);
	if (PUBLIC_STAGE === 'local') {
		return {
			googleClientId:
				'848724615154-hlbsminri03tvelsj62fljh5v0tmcjaa.apps.googleusercontent.com',
			apiUrl: 'http://localhost:4567',
			serverWsUrl: 'ws://localhost:4567'
		};
	} else if (PUBLIC_STAGE === 'dev') {
		return {
			googleClientId:
				'848724615154-dt9ejfs9rfu1vfhkvlk19pg6rbvnue9u.apps.googleusercontent.com',
			apiUrl: 'http://localhost:4567',
			serverWsUrl: 'ws://localhost:4567'
		};
	} else if (PUBLIC_STAGE === 'prod') {
		return {
			googleClientId:
				'848724615154-0ln8g1cq9iiddeqtlgv1qfcqf0snbrng.apps.googleusercontent.com',
			apiUrl: 'http://localhost:4567',
			serverWsUrl: 'ws://localhost:4567'
		};
	} else {
		throw new Error(`unknown stage: ${PUBLIC_STAGE}`);
	}
})();
