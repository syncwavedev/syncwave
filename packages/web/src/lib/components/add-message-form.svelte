<script lang="ts">
	import {getMe, getSdk, yFragmentToPlaintext} from '$lib/utils';
	import {
		Crdt,
		createMessageId,
		createRichtext,
		getNow,
		type BoardId,
		type CardId,
		type Message,
		type MessageDto,
	} from 'syncwave-data';
	import ArrowUpIcon from './icons/arrow-up-icon.svelte';
	import AttachIcon from './icons/attach-icon.svelte';
	import Editor from './editor.svelte';
	import {Doc} from 'yjs';
	import UploadButton from './upload-button.svelte';
	import AttachmentPreview from './attachment-preview.svelte';

	interface Props {
		cardId: CardId;
		boardId: BoardId;
		onSend: (message: Crdt<Message>) => void;
	}

	let {cardId, boardId, onSend}: Props = $props();
	const me = getMe();

	const doc = new Doc();
	const fragment = doc.getXmlFragment('message');

	function shouldShowSendButton() {
		return yFragmentToPlaintext(fragment).trim() !== '';
	}

	let textSendable = $state(shouldShowSendButton());
	$effect(() => {
		const listener = () => (textSendable = shouldShowSendButton());
		doc.on('updateV2', listener);
		return () => doc.off('updateV2', listener);
	});

	const sdk = getSdk();

	let attachments: File[] = $state([]);
	let showSendButton = $derived(attachments.length > 0 || textSendable);

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
				attachmentIds: [],
				boardId: boardId,
			});

			onSend(message);

			reset();

			await sdk(x => x.createMessage({diff: message.state()}));
		} else {
			reset();
		}
	}

	function reset() {
		editorRef?.clear();
		attachments = [];
	}
</script>

<div>
	{#if attachments.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each attachments as file}
				<AttachmentPreview
					{file}
					onRemove={() => {
						attachments = attachments.filter(f => f !== file);
					}}
				/>
			{/each}
		</div>
	{/if}
</div>
<div
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex shrink-0 items-center gap-1 border-t p-2"
>
	<UploadButton
		class="btn--icon mt-auto"
		callback={file => attachments.push(file)}
	>
		<AttachIcon />
	</UploadButton>
	<div class="flex-1">
		<Editor
			bind:this={editorRef}
			onEnter={sendMessage}
			{fragment}
			placeholder="Type a message..."
		/>
	</div>
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
