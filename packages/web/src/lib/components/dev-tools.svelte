<script lang="ts">
	import {getAuthManager, getSdk} from '$lib/utils';
	import {stringifyTuple, type DataNodeDto, type Tuple} from 'syncwave-data';

	const sdk = getSdk();
	let itemsPromise: Promise<DataNodeDto> | undefined = $state(undefined);

	$effect(() => {
		itemsPromise = sdk(x => x.getDbTree({}));
	});

	function openDetails(path: Tuple[]) {
		detailsPromise = (async () => {
			const info = await sdk(x => x.getDbItem({path}));
			return JSON.stringify(info, null, 2);
		})();
	}

	async function remove(path: Tuple[]): Promise<void> {
		if (!confirm('Are you sure?')) return;
		await sdk(x => x.deleteDbItem({path}));
	}

	const auth = getAuthManager();
	function signOut() {
		auth.logOut();
	}

	let detailsPromise: Promise<string> | undefined = $state(undefined);
</script>

<div class="flex max-h-[100vh] flex-col gap-2 p-2">
	<div class="h-[50px]">
		<button
			onclick={async () => {
				if (!confirm('Are you sure? This will delete whole database'))
					return;
				await sdk(x => x.truncateDb({}));
			}}
		>
			Reset store
		</button>
		<button onclick={signOut}>Sign out</button>
	</div>
	<div class="flex min-h-0 flex-1 gap-8">
		<div>
			{#if itemsPromise}
				{#await itemsPromise then root}
					<div class="font-mono">
						{#snippet itemView(item: DataNodeDto, path: Tuple[])}
							<div class="flex items-center">
								<button onclick={() => remove(path)}>
									Delete
								</button>
								<button onclick={() => openDetails(path)}>
									{stringifyTuple(item.key)}
									<span class="text-gray-400"
										>[{item.type}]</span
									>
								</button>
							</div>
							<div class="border-l pl-4">
								{#each item.childrenPreview as child}
									{@render itemView(child, [
										...path,
										child.key,
									])}
								{/each}
							</div>
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
</div>
