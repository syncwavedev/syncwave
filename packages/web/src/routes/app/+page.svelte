<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {logger, type Board} from 'ground-data';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();

	const sdk = getSdk();

	let cancelled = false;

	let boards: Board[] = $state([]);
	let itemValue: string = $state('');

	const topic = `topic-${Math.random().toString().split('.')[1]}`;

	async function publish() {
		await sdk(rpc => rpc.streamPut({topic, value: itemValue}));
	}

	$effect(() => {
		(async () => {
			try {
				logger.info('request boards...');
				const [initialBoards, boards$] = await sdk(x => x.getMyBoards({}));
				boards = initialBoards;
				logger.info('start reading boards...');
				let index = 0;
				for await (const nextBoards of boards$) {
					index += 1;
					if (index >= 3) {
						break;
					}
					logger.info('next boards', nextBoards.length);
					boards = nextBoards;
				}
			} finally {
				logger.info('boards stream closed');
			}
		})();
	});
</script>

{#if idInfo}
	<div>
		<Button onclick={() => auth.logOut()}>Log out</Button>
	</div>
	User: {idInfo.userId}
{:else}
	<Button href="/log-in">Log in</Button>
{/if}

<Button onclick={() => (cancelled = true)}>Stop stream</Button>
<Input bind:value={itemValue} type="text" />
<Button onclick={publish}>Publish into stream</Button>

<div>
	{#each boards as board}
		<div>
			{board.createdAt} - {board.name}
		</div>
	{/each}
</div>
