<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import {getSdk} from '$lib/utils';
	import {type DataNodeDto} from 'ground-data';
	import {ChevronDown, Dot} from 'lucide-svelte';

	let source: 'client' | 'server' = $state('server');

	const sdk = getSdk();
	let itemsPromise: Promise<DataNodeDto> | undefined = $state(undefined);

	$effect(() => {
		itemsPromise = sdk.coordinatorRpc.getDbTree({});
	});

	function openDetails(path: Uint8Array[]) {
		detailsPromise = (async () => {
			const info = await sdk.coordinatorRpc.getDbItem({path});
			return JSON.stringify(info, null, 2);
		})();
	}

	let detailsPromise: Promise<string> | undefined = $state(undefined);
</script>

<div class="text-2xl font-semibold">Store</div>
<!-- <Button onclick={() => sdk.coordinatorRpc.truncateDb({})}>Reset store</Button> -->
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
								<Button variant="ghost" onclick={() => openDetails(path)}>
									[{item.type}] {item.name}
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
