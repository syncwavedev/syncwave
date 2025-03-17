<!-- <script lang="ts">
	import type {PageProps} from './$types';
	import {unimplemented} from 'syncwave-data';
	import {goto} from '$app/navigation';
	import {getAuthManager, showErrorToast} from '$lib/utils';

	const {data}: PageProps = $props();
	const {token, redirectUrl} = data;

	if (token) {
		const store = getAuthManager();
		store.logIn(token);
	} else {
		unimplemented();
	}

	if (redirectUrl) {
		window.location.href = redirectUrl;
	} else {
		goto(`/auth/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`);
		showErrorToast();
	}
</script> -->
