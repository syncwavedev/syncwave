<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {createBoardId} from 'syncwave-data';
	import AddBoardDialogSettings from './add-board-dialog-board-settings.svelte';
	import AddBoardDialogMemberList from './add-board-dialog-member-list.svelte';

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

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="region"
		class="fixed top-0 left-0 z-[1000] flex h-screen w-screen items-center justify-center bg-black/20 backdrop-blur-xs"
		onclick={close}
	></div>

	<div
		class="bg-subtle-1 fixed top-1/3 left-1/2 z-[1000] w-106 -translate-x-1/2 -translate-y-1/2 rounded-3xl"
	>
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
	</div>
{/if}
