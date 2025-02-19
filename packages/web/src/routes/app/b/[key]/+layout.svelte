<script lang="ts">
	import type {LayoutProps} from './$types';

	let {children, data}: LayoutProps = $props();
</script>

{#key data.boardKey}
	{@render children()}
{/key}
