<script lang="ts">
	import type {LayoutProps} from './$types';
	import {page} from '$app/state';

	let {children, data}: LayoutProps = $props();
</script>

{#key data.boardKey}
	{@render children()}
{/key}
