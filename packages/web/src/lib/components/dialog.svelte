<script lang="ts">
	import type {Snippet} from 'svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
		children: Snippet;
	}

	let {open, onClose, children}: Props = $props();
</script>

<svelte:body onkeydown={e => e.key === 'Escape' && close()} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="region"
		class="fixed top-0 left-0 z-[1000] flex h-screen w-screen items-center justify-center bg-black/20 backdrop-blur-xs"
		onclick={onClose}
	></div>

	<div
		class="bg-subtle-0 fixed top-1/6 left-1/2 z-[1000] w-106 -translate-x-1/2 rounded-2xl"
	>
		{@render children()}
	</div>
{/if}
