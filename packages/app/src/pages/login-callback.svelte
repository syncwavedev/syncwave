<script lang="ts">
	import {unimplemented} from 'syncwave-data';
	import router from '../lib/router';
	import {getAuthManager} from '../lib/utils';

	const urlParams = new URLSearchParams(window.location.search);
	const token = urlParams.get('token');
	const redirectUrl = urlParams.get('redirectUrl');

	if (token) {
		const store = getAuthManager();
		store.logIn(token);
	} else {
		unimplemented();
	}

	if (redirectUrl) {
		window.location.href = redirectUrl;
	} else {
		router.navigate({
			uri: `/auth/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`,
		});
		console.error('Redirect URL not provided');
	}
</script>
