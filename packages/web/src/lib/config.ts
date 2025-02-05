import {PUBLIC_STAGE} from '$env/static/public';

export interface AppConfig {
	googleClientId: string;
	apiUrl: string;
	serverWsUrl: string;
}

// wss://api-syncwave-dev.edme.io:443
export const appConfig: AppConfig = (() => {
	if (PUBLIC_STAGE === 'local') {
		return {
			googleClientId:
				'848724615154-hlbsminri03tvelsj62fljh5v0tmcjaa.apps.googleusercontent.com',
			apiUrl: 'http://localhost:4567',
			serverWsUrl: 'ws://localhost:4567',
		};
	} else if (PUBLIC_STAGE === 'dev') {
		return {
			googleClientId:
				'848724615154-dt9ejfs9rfu1vfhkvlk19pg6rbvnue9u.apps.googleusercontent.com',
			apiUrl: 'https://api-syncwave-dev.edme.io',
			serverWsUrl: 'wss://api-syncwave-dev.edme.io',
		};
	} else if (PUBLIC_STAGE === 'prod') {
		return {
			googleClientId:
				'848724615154-0ln8g1cq9iiddeqtlgv1qfcqf0snbrng.apps.googleusercontent.com',
			apiUrl: 'https://api-syncwave.edme.io',
			serverWsUrl: 'wss://api-syncwave.edme.io',
		};
	} else {
		throw new Error(`unknown stage: ${PUBLIC_STAGE}`);
	}
})();
