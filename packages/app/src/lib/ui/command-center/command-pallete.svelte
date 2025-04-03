<script lang="ts">
	import {Portal} from 'bits-ui';
	import ScrollArea from '../../components/scroll-area.svelte';
	import type {Snippet} from 'svelte';
	import ArrowLeft from '../components/icons/arrow-left.svelte';

	let {
		title,
		searchMode = false,
		children,
	}: {
		title: string;
		searchMode?: boolean;
		children: Snippet;
	} = $props();
</script>

{#if true}
	<Portal>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			role="region"
			class="fixed top-0 left-0 z-[1000] flex h-screen w-screen items-center justify-center bg-black/20 backdrop-blur-xs"
			onclick={() => {}}
		></div>

		<div
			class="bg-subtle-0 fixed top-1/6 left-1/2 z-[1000] w-106 -translate-x-1/2 rounded-2xl"
		>
			<ScrollArea class="max-h-dialog" orientation="both">
				<div class="h-dialog flex flex-col">
					<div class="shrink-0">
						<form class="my-2 flex h-[2.5em] items-center px-4">
							<button type="button" onclick={() => {}} class="btn--icon">
								<ArrowLeft />
							</button>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								autocomplete="off"
								type="email"
								class="input ml-1.5 text-xs"
								placeholder="Enter an email to add a member..."
								autofocus
							/>
							<input type="submit" class="hidden" value="Add member" />
						</form>
						<hr />
					</div>
					<div class="min-h-0 flex-1">
						<ScrollArea orientation="both" class="h-full">
							<div class="mx-2 my-2 flex flex-col">
								{@render children()}
							</div>
						</ScrollArea>
					</div>
					<div class="shrink-0">
						<hr />
						<button onclick={() => {}} class="btn--block mx-4 my-2 ml-auto">
							<span class="text-xs">Done</span>
						</button>
					</div>
				</div>
			</ScrollArea>
		</div>
	</Portal>
{/if}
