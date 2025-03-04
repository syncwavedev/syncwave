<script lang="ts">
	import {getMe, getSdk, yFragmentToPlaintext} from '$lib/utils';
	import {
		Crdt,
		createMessageId,
		createRichtext,
		getNow,
		type CardId,
		type Message,
		type MessageId,
		type UserDto,
	} from 'syncwave-data';
	import ArrowUpIcon from './icons/arrow-up-icon.svelte';
	import AttachIcon from './icons/attach-icon.svelte';
	import Editor from './editor.svelte';
	import {Doc} from 'yjs';

	interface Props {
		cardId: CardId;
	}

	let {cardId}: Props = $props();
	const me = getMe();

	const doc = new Doc();
	const fragment = doc.getXmlFragment('message');

	function shouldShowSendButton() {
		return yFragmentToPlaintext(fragment).trim() !== '';
	}

	let showSendButton = $state(shouldShowSendButton());
	$effect(() => {
		const listener = () => (showSendButton = shouldShowSendButton());
		doc.on('updateV2', listener);
		return () => doc.off('updateV2', listener);
	});

	const sdk = getSdk();

	let editorRef: Editor | undefined = $state(undefined);

	async function sendMessage() {
		if (yFragmentToPlaintext(fragment).trim() !== '') {
			const createdAt = getNow();
			const messageId = createMessageId();
			const message = Crdt.from<Message>({
				id: messageId,
				pk: [messageId],
				authorId: me.value.user.id,
				cardId,
				createdAt,
				updatedAt: createdAt,
				deleted: false,
				text: createRichtext(fragment),
			});

			await sdk(x => x.createMessage({diff: message.state()}));
		}

		editorRef?.clear();
	}
</script>

{#key fragment}
	<div
		class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex shrink-0 items-center gap-1 border-t p-2"
	>
		<button type="button" class="btn--icon mt-auto">
			<AttachIcon />
		</button>
		<div class="flex-1">
			<Editor
				bind:this={editorRef}
				onEnter={sendMessage}
				{fragment}
				placeholder="Type a message..."
			/>
		</div>
		<!-- <textarea
			class="input flex-grow text-xs leading-relaxed"
			rows="1"
			bind:value={text}
			required
			placeholder="Type a message..."
			onkeydown={handleKeyDown}
		></textarea> -->
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
{/key}
