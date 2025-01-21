<script lang="ts">
	import { appConfig } from '../../config';

	const state = { redirectUrl: '/' };
	const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
	const options = {
		redirect_uri: `${appConfig.apiUrl}/callbacks/google`,
		client_id: appConfig.googleClientId,
		access_type: 'offline',
		response_type: 'code',
		prompt: 'consent',
		state: '',
		scope: ['https://www.googleapis.com/auth/userinfo.email'].join(' ')
	};

	if (state) {
		options.state = encodeURIComponent(JSON.stringify(state));
	}

	const signInUrl = `${rootUrl}?${new URLSearchParams(options).toString()}`;
</script>

<a href={signInUrl}>Continue with Google</a>

<a href="/">Home</a>
