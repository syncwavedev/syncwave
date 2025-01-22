<script lang="ts">
	import type {PageProps} from './$types';
	import {unimplemented} from 'ground-data';
	import {goto} from '$app/navigation';
	import {getUniversalStore, showErrorToast} from '$lib/utils';

	const {data}: PageProps = $props();
	const {token, redirectUrl} = data;

	if (token) {
		const store = getUniversalStore();
		store.set('jwt', token);
	} else {
		unimplemented();
	}

	if (redirectUrl) {
		goto(redirectUrl);
	} else {
		goto(`/log-in?redirectUrl=${encodeURIComponent(redirectUrl ?? '/')}`);
		showErrorToast();
	}
</script>
