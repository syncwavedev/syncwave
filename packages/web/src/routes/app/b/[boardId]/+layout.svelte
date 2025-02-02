<script lang="ts">
	import type {LayoutProps} from './$types';
	import {page} from '$app/state';

	let {children}: LayoutProps = $props();
</script>

{#key page.params.boardId}
	{@render children()}
{/key}
