<script lang="ts">
	import type {PageProps} from './$types';
	import {unimplemented} from 'ground-data';
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
		goto(`/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`);
		showErrorToast();
	}
</script>
