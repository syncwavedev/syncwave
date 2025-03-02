<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {createBoardId} from 'syncwave-data';
	import AddBoardDialogSettings from './add-board-dialog-board-settings.svelte';
	import AddBoardDialogMemberList from './add-board-dialog-member-list.svelte';
	import Dialog from './dialog.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let step: 'settings' | 'members' = $state('settings');

	let {open, onClose}: Props = $props();

	function reset() {
		step = 'settings';
	}

	let name = $state('');
	let key = $state('');
	let members = $state<string[]>([]);

	const sdk = getSdk();

	async function createBoard() {
		await sdk(x =>
			x.createBoard({boardId: createBoardId(), key, name, members})
		);
		onClose();
	}

	function close() {
		reset();
		onClose();
	}
</script>

<svelte:body onkeydown={e => e.key === 'Escape' && close()} />

<Dialog {open} onClose={close}>
	{#if step === 'settings'}
		<AddBoardDialogSettings
			bind:name
			bind:key
			onClose={close}
			onNext={() => (step = 'members')}
		/>
	{/if}
	{#if step === 'members'}
		<AddBoardDialogMemberList
			bind:members
			onBack={() => (step = 'settings')}
			onDone={createBoard}
		/>
	{/if}
</Dialog>
