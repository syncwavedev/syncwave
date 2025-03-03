<script lang="ts">
	import {getSdk} from '$lib/utils';
	import {createMessageId, type CardId, type UserDto} from 'syncwave-data';
	import ArrowUpIcon from './icons/arrow-up-icon.svelte';
	import AttachIcon from './icons/attach-icon.svelte';

	interface Props {
		cardId: CardId;
	}

	let {cardId}: Props = $props();

	let text = $state('');
	let showSendButton = $derived(text.trim() !== '');

	const sdk = getSdk();
	async function handleKeyDown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.shiftKey) return;
		e.preventDefault();

		await sendMessage();
	}

	async function sendMessage() {
		if (text.trim() !== '') {
			const messageId = createMessageId();
			await sdk(x => x.createMessage({cardId, messageId, text}));
		}

		text = '';
	}
</script>

<div
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex shrink-0 items-center gap-1 border-t p-2"
>
	<button type="button" class="btn--icon mt-auto">
		<AttachIcon />
	</button>
	<textarea
		class="input flex-grow text-xs leading-relaxed"
		rows="1"
		bind:value={text}
		required
		placeholder="Type a message..."
		onkeydown={handleKeyDown}
	></textarea>
	{#if showSendButton}
		<button
			onclick={sendMessage}
			type="submit"
			class="btn--icon btn--icon--ink mt-auto"
		>
			<ArrowUpIcon />
		</button>
	{/if}
</div>
