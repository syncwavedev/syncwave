<script lang="ts">
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import LinkIcon from '../components/icons/link-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import TimesIcon from '../components/icons/times-icon.svelte';
    import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
    import UserIcon from '../components/icons/user-icon.svelte';
    import Editor from '../../components/editor.svelte';
    import type {CardView} from '../../agent/view.svelte';
    import type {Awareness} from 'syncwave';
    import type {ColumnId, User, UserId} from 'syncwave';
    import {onMount, tick} from 'svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import Select from '../components/select.svelte';
    import {getAgent} from '../../agent/agent';
    import RichtextView from '../../components/richtext-view.svelte';
    import {createXmlFragment, yFragmentToPlaintext} from '../../richtext';
    import ArrowUp from '../components/icons/arrow-up.svelte';
    import Avatar from '../components/avatar.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    const {
        card,
        awareness,
        me,
        columnOptions,
        assigneeOptions,
        onDelete,
    }: {
        card: CardView;
        awareness: Awareness;
        me: User;
        columnOptions: {
            value: string;
            label: string;
        }[];
        assigneeOptions: {
            value: string;
            label: string;
        }[];
        onDelete: () => void;
    } = $props();

    const agent = getAgent();

    let editor: Editor | null = $state(null);
    let scrollable: HTMLDivElement;

    onMount(() => {
        tick().then(() => {
            if (card.isDraft && editor) {
                editor.focus();
            }
        });
    });

    const detailsPromise = agent.observeCardAsync(card.id);

    detailsPromise.then(details => {
        console.debug('Details:', details);
    });

    const fragment = createXmlFragment();
    let isNewMessageEmpty = $state(true);
    $effect(() => {
        const observer = () => {
            isNewMessageEmpty =
                yFragmentToPlaintext(fragment).trim().length === 0;
        };

        fragment.observeDeep(observer);
        return () => fragment.unobserveDeep(observer);
    });

    const onSendMessage = async (e?: Event) => {
        e?.preventDefault();

        agent.createMessage({
            boardId: card.boardId,
            columnId: card.columnId,
            cardId: card.id,
            fragment: fragment,
        });

        fragment.delete(0, fragment.length);

        // Wait for DOM to update and then scroll to bottom
        await tick();
        scrollable?.scrollTo({
            top: scrollable.scrollHeight,
            behavior: 'smooth',
        });
    };
</script>

<div
    class="border-divider bg-surface-0 z-10 flex w-full flex-shrink-0 flex-col border-l"
>
    <div class="flex items-center px-4 py-2">
        <div class="flex items-center gap-0.5 icon-base select-text">
            {#if card.isDraft}
                New card
            {:else}
                <HashtagIcon />
                <span>{card.counter}</span>
            {/if}
        </div>
        <div class="relative ml-auto">
            <DropdownMenu
                items={[
                    {
                        icon: LinkIcon,
                        text: 'Copy Card Link',
                        onSelect: () => {
                            navigator.clipboard.writeText(window.location.href);
                        },
                    },
                    {
                        icon: TrashIcon,
                        text: 'Delete',
                        onSelect: () => onDelete(),
                    },
                ]}
            >
                <button class="btn--icon text-ink-body" id="ellipsis-button">
                    <EllipsisIcon />
                </button>
            </DropdownMenu>
        </div>
        <button class="btn--icon text-ink-body" onclick={() => history.back()}>
            <TimesIcon />
        </button>
    </div>
    <!-- Scrollable Content Section -->
    <div
        bind:this={scrollable}
        class="overflow-y-auto no-scrollbar flex flex-col flex-1"
    >
        <!-- Task Description -->
        <div class="mx-4 mt-1">
            <div
                class="input w-full leading-relaxed transition-colors duration-150"
            >
                <Editor
                    bind:this={editor}
                    placeholder="Description"
                    fragment={card.text.__fragment!}
                    class="min-h-15"
                    {awareness}
                    {me}
                />
            </div>

            <!-- Task Actions -->
            <div class="flex gap-2 text-ink-body my-3 text-sm icon-sm">
                <Select
                    value={card.column.id}
                    options={columnOptions}
                    onValueChange={value =>
                        agent.setCardColumn(card.id, value as ColumnId)}
                >
                    <button class="btn-ghost">
                        <CircleDashedIcon />
                        {card.column.name}
                    </button>
                </Select>

                <Select
                    value={card.assignee?.id ?? ''}
                    options={assigneeOptions}
                    onValueChange={value =>
                        agent.setCardAssignee(card.id, value as UserId)}
                >
                    <button class="btn-ghost">
                        <UserIcon />
                        {card.assignee?.fullName ?? 'Assignee'}
                    </button>
                </Select>
            </div>
        </div>
        <hr />
        <div class="flex flex-col gap-4 my-4 flex-1">
            {#await detailsPromise then details}
                {#each details.messages as message (message.id)}
                    <div class="flex gap-2 mx-4 avatar-lg">
                        <Avatar name={message.author.fullName} />

                        <div class="flex flex-col">
                            <div class="flex items-center gap-1.5">
                                <div class="flex items-baseline gap-1.5">
                                    <div class="font-semibold leading-none">
                                        {message.author.fullName}
                                    </div>

                                    <span class="text-ink-detail text-xs">
                                        {new Date(message.createdAt)
                                            .toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                            .toLowerCase()}
                                    </span>
                                </div>
                            </div>
                            <div class="select-text leading-relaxed">
                                <RichtextView
                                    fragment={message.payload.text.__fragment!}
                                />
                            </div>
                        </div>
                    </div>
                {/each}
            {/await}
        </div>
    </div>
    <div class="px-4 pb-4 flex gap-2 items-end">
        <form
            class="flex items-end bg-surface-0 border border-divider z-10 rounded-md w-full p-1.5"
            onsubmit={onSendMessage}
        >
            <button class="btn--icon">
                <PlusIcon />
            </button>
            <Editor
                {fragment}
                {me}
                placeholder="Write a message..."
                class="px-1 py-1 w-full"
                onEnter={() => onSendMessage()}
            />
            <button
                type="submit"
                class="btn--icon"
                disabled={isNewMessageEmpty}
            >
                <ArrowUp />
            </button>
        </form>
    </div>
</div>
