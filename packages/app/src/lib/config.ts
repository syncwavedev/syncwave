import {assertDefined} from 'syncwave';

const PUBLIC_STAGE = import.meta.env.VITE_PUBLIC_STAGE;

export interface AppConfig {
	googleClientId: string;
	apiUrl: string;
	serverWsUrl: string;
	stage: 'dev' | 'local' | 'prod' | 'self_hosted';
}

// wss://api-dev.syncwave.dev:443
export const appConfig: AppConfig = (() => {
	if (PUBLIC_STAGE === 'local') {
		return {
			googleClientId:
				'848724615154-hlbsminri03tvelsj62fljh5v0tmcjaa.apps.googleusercontent.com',
			apiUrl: 'http://localhost:4567',
			serverWsUrl: 'ws://localhost:4567',
			stage: PUBLIC_STAGE,
		};
	} else if (PUBLIC_STAGE === 'dev') {
		return {
			googleClientId:
				'848724615154-dt9ejfs9rfu1vfhkvlk19pg6rbvnue9u.apps.googleusercontent.com',
			apiUrl: 'https://api-dev.syncwave.dev',
			serverWsUrl: 'wss://api-dev.syncwave.dev',
			stage: PUBLIC_STAGE,
		};
	} else if (PUBLIC_STAGE === 'prod') {
		return {
			googleClientId:
				'848724615154-0ln8g1cq9iiddeqtlgv1qfcqf0snbrng.apps.googleusercontent.com',
			apiUrl: 'https://api.syncwave.dev',
			serverWsUrl: 'wss://api.syncwave.dev',
			stage: PUBLIC_STAGE,
		};
	} else if (PUBLIC_STAGE === 'self_hosted') {
		return {
			serverWsUrl: window.location.origin,
			apiUrl: window.location.origin + '/api',
			stage: PUBLIC_STAGE,
			googleClientId: assertDefined(
				(window as any).CONFIG_GOOGLE_CLIENT_ID,
				'window.CONFIG_GOOGLE_CLIENT_ID must be defined in self-hosted mode'
			),
		};
	} else {
		throw new Error(`unknown stage: ${PUBLIC_STAGE}`);
	}
})();
