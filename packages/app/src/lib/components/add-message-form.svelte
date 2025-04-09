<script lang="ts">
    import {getRpc, getUploadManager, showErrorToast} from '../utils';
    import {
        Crdt,
        createMessageId,
        createRichtext,
        getNow,
        whenAll,
        type AttachmentDto,
        type BoardId,
        type CardId,
        type ColumnId,
        type Message,
    } from 'syncwave';
    import ArrowUpIcon from './icons/arrow-up-icon.svelte';
    import AttachIcon from './icons/attach-icon.svelte';
    import Editor from './editor.svelte';
    import {Doc} from 'yjs';
    import UploadButton from './upload-button.svelte';
    import AttachmentPreview from './attachment-preview.svelte';
    import SpinnerIcon from './icons/spinner-icon.svelte';
    import {yFragmentToPlaintext} from '../richtext';
    import type {MeView} from '../agent/view.svelte';

    interface Props {
        me: MeView;
        cardId: CardId;
        columnId: ColumnId;
        boardId: BoardId;
        onSend: (message: Crdt<Message>, attachments: AttachmentDto[]) => void;
    }

    let {cardId, boardId, columnId, onSend, me}: Props = $props();

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

    const rpc = getRpc();

    interface FileState {
        file: File;
        uploading: boolean;
        attachment: Promise<AttachmentDto>;
    }

    let files: readonly FileState[] = $state.raw([]);
    let showSendButton = $derived(files.length > 0 || textSendable);

    let editorRef: Editor | undefined = $state(undefined);

    let sendInProgress = $state(false);

    async function sendMessage() {
        if (sendInProgress) return;
        try {
            sendInProgress = true;
            if (
                yFragmentToPlaintext(fragment).trim() !== '' ||
                files.length > 0
            ) {
                const createdAt = getNow();
                const messageId = createMessageId();
                const attachments = await whenAll(files.map(x => x.attachment));
                const message = Crdt.from<Message>({
                    id: messageId,
                    pk: [messageId],
                    authorId: me.profileView.id,
                    cardId,
                    columnId,
                    target: 'card',
                    createdAt,
                    updatedAt: createdAt,
                    payload: {
                        type: 'text',
                        text: createRichtext(fragment),
                        attachmentIds: attachments.map(x => x.id),
                    },
                    boardId: boardId,
                });

                onSend(message, attachments);

                reset();

                await rpc(x => x.createMessage({diff: message.state()}));
            } else {
                reset();
            }
        } finally {
            sendInProgress = false;
        }
    }

    function reset() {
        editorRef?.clear();
        files = [];
    }

    const uploadManager = getUploadManager();

    async function handleAttach(file: File) {
        const fileState = {
            file,
            uploading: true,
            attachment: uploadManager
                .upload({files: [file], boardId, cardId})
                .then(([attachment]) => {
                    files = files.map(x =>
                        x === fileState ? {...x, uploading: false} : x
                    );

                    return attachment;
                }),
        };
        fileState.attachment.catch((error: unknown) => {
            files = files.filter(x => x !== fileState);
            showErrorToast(error);
        });
        files = [...files, fileState];
    }
</script>

<div>
    {#if files.length > 0}
        <div class="flex flex-wrap gap-1">
            {#each files as file (file)}
                <AttachmentPreview
                    file={file.file}
                    loading={file.uploading}
                    onRemove={() => {
                        files = files.filter(f => f !== file);
                    }}
                />
            {/each}
        </div>
    {/if}
</div>
<div
    class="border-divider bg-surface-0 dark:bg-surface-1 flex shrink-0 items-center gap-1 border-t p-2"
>
    <UploadButton class="btn--icon mt-auto" callback={handleAttach}>
        <AttachIcon />
    </UploadButton>
    <div class="flex-1">
        <Editor
            me={me.profileView}
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
            {#if sendInProgress}
                <SpinnerIcon />
            {:else}
                <ArrowUpIcon />
            {/if}
        </button>
    {/if}
</div>
