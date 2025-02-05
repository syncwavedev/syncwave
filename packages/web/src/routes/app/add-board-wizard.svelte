<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {BusinessError, createBoardId} from 'syncwave-data';
	import {goto} from '$app/navigation';
	import {Input} from '$lib/components/ui/input/index.js';
	import {Label} from '$lib/components/ui/label/index.js';
	import {Button} from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import {CircleAlert, LoaderCircle} from 'lucide-svelte';

	const sdk = getSdk();
	let boardName = $state('');
	let boardKey = $state('');
	let error = $state('');
	let isLoading = $state(false);
	let {onCreate}: {onCreate?: () => void} = $props();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		isLoading = true;
		error = '';

		try {
			const boardId = createBoardId();
			const board = await sdk(rpc =>
				rpc.createBoard({
					boardId,
					name: boardName.trim() || 'Untitled',
					key: boardKey.trim() || boardId,
				})
			);

			goto(`/app/b/${board.key}`);
			onCreate?.();
		} catch (e) {
			if (e instanceof BusinessError && e.code === 'board_key_taken') {
				error = 'A board with this key already exists';
			} else {
				error = 'Failed to create board';
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="grid gap-6">
	<form on:submit={onSubmit}>
		<div class="grid gap-2">
			<div class="grid gap-1">
				<Label for="boardName">Board Name</Label>
				<Input
					id="boardName"
					placeholder="My Board"
					required
					bind:value={boardName}
					disabled={isLoading}
				/>
			</div>
			<div class="grid gap-1">
				<Label for="boardKey">Board Key</Label>
				<Input
					id="boardKey"
					placeholder="my-board"
					bind:value={boardKey}
					disabled={isLoading}
				/>
			</div>
			<Button type="submit" disabled={isLoading}>
				{#if isLoading}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Board
			</Button>
		</div>
	</form>

	{#if error}
		<Alert.Root variant="destructive">
			<CircleAlert class="size-4" />
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}
</div>
