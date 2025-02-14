<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {type DataNodeDto} from 'syncwave-data';
	import {ChevronDown, Dot, Trash} from 'lucide-svelte';
	import {ScrollArea} from '$lib/components/ui/scroll-area';

	let source: 'client' | 'server' = $state('server');

	const sdk = getSdk();
	let itemsPromise: Promise<DataNodeDto> | undefined = $state(undefined);

	$effect(() => {
		itemsPromise = sdk(x => x.getDbTree({}));
	});

	function openDetails(path: Uint8Array[]) {
		detailsPromise = (async () => {
			const info = await sdk(x => x.getDbItem({path}));
			return JSON.stringify(info, null, 2);
		})();
	}

	async function remove(path: Uint8Array[]): Promise<void> {
		if (!confirm('Are you sure?')) return;
		const res = await sdk(x => x.deleteDbItem({path}));
	}

	const auth = getAuthManager();
	function signOut() {
		auth.logOut();
	}

	let detailsPromise: Promise<string> | undefined = $state(undefined);
</script>

<div class="flex max-h-[100vh] flex-col gap-2 p-2">
	<div class="h-[50px]">
		<Button
			variant="destructive"
			onclick={async () => {
				if (!confirm('Are you sure? This will delete whole database'))
					return;
				await sdk(x => x.truncateDb({}));
			}}>Reset store</Button
		>
		<Button variant="outline" onclick={signOut}>Sign out</Button>
	</div>
	<div class="flex min-h-0 flex-1 gap-8">
		<ScrollArea>
			<div>
				{#if itemsPromise}
					{#await itemsPromise then root}
						<div class="font-mono">
							{#snippet itemView(
								item: DataNodeDto,
								path: Uint8Array[]
							)}
								<Collapsible.Root open>
									<div class="flex items-center">
										{#if item.childrenPreview.length > 0}
											<Collapsible.Trigger
												><ChevronDown
												/></Collapsible.Trigger
											>
										{:else}
											<Dot />
										{/if}
										<Button
											onclick={() => remove(path)}
											variant="ghost"
											size="icon"
										>
											<Trash />
										</Button>
										<Button
											variant="ghost"
											onclick={() => openDetails(path)}
										>
											{item.name}
											<span class="text-gray-400"
												>[{item.type}]</span
											>
										</Button>
									</div>
									<Collapsible.Content>
										<div class="border-l pl-4">
											{#each item.childrenPreview as child}
												{@render itemView(child, [
													...path,
													child.key,
												])}
											{/each}
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							{/snippet}

							{@render itemView(root, [root.key])}
						</div>
					{/await}
				{/if}
			</div>
		</ScrollArea>
		<div class="flex-1">
			{#if detailsPromise}
				{#await detailsPromise then details}
					<pre>{details}</pre>
				{/await}
			{/if}
		</div>
	</div>
</div>
