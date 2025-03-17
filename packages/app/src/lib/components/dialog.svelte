<script lang="ts">
	import type {Snippet} from 'svelte';
	import ScrollArea from './scroll-area.svelte';
	import {Portal} from 'bits-ui';

	interface Props {
		open: boolean;
		onClose: () => void;
		children: Snippet;
	}

	let {open, onClose, children}: Props = $props();
</script>

{#if open}
	<Portal>
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
			<ScrollArea class="max-h-dialog" orientation="both">
				{@render children()}
			</ScrollArea>
		</div>
	</Portal>
{/if}
