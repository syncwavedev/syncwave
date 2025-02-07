<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {type DataNodeDto} from 'syncwave-data';
	import {ChevronDown, Dot, Trash} from 'lucide-svelte';

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
		console.log('yes!');
		const res = await sdk(x => x.deleteDbItem({path}));
		console.log('res', res);
	}

	let detailsPromise: Promise<string> | undefined = $state(undefined);
</script>

<Button variant="destructive" onclick={() => sdk(x => x.truncateDb({}))}>Reset store</Button>
<div class="flex gap-8">
	<div>
		{#if itemsPromise}
			{#await itemsPromise then root}
				<div class="font-mono">
					<!-- <Tabs.Root class="w-[400px]" bind:value={source}>
                        <Tabs.List>
                            <Tabs.Trigger value="client">Client</Tabs.Trigger>
                            <Tabs.Trigger value="server">Server</Tabs.Trigger>
                        </Tabs.List>
                    </Tabs.Root> -->

					{#snippet itemView(item: DataNodeDto, path: Uint8Array[])}
						<Collapsible.Root open>
							<div class="flex items-center">
								{#if item.childrenPreview.length > 0}
									<Collapsible.Trigger><ChevronDown /></Collapsible.Trigger>
								{:else}
									<Dot />
								{/if}
								<Button onclick={() => remove(path)} variant="ghost" size="icon">
									<Trash />
								</Button>
								<Button variant="ghost" onclick={() => openDetails(path)}>
									{item.name} <span class="text-gray-400">[{item.type}]</span>
								</Button>
							</div>
							<Collapsible.Content>
								<div class="border-l pl-4">
									{#each item.childrenPreview as child}
										{@render itemView(child, [...path, child.key])}
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
	<div class="flex-1">
		{#if detailsPromise}
			{#await detailsPromise then details}
				<pre>{details}</pre>
			{/await}
		{/if}
	</div>
</div>
