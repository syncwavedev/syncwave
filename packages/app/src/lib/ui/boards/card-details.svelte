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
    import {getAgent} from '../../agent/agent.svelte';
    import {
        cloneYFragment,
        createXmlFragment,
        yFragmentToPlaintext,
    } from '../../richtext';
    import ArrowUp from '../components/icons/arrow-up.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import MessageList from './message-list.svelte';

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
    let isScrolled = $state(false);

    onMount(() => {
        tick().then(() => {
            if (card.isDraft && editor) {
                editor.focus();
            }
        });
    });

    const detailsPromise = agent.observeCardAsync(card.id);

    const fragment = createXmlFragment();
    let isNewMessageEmpty = $state(true);
    $effect(() => {
        const messageLengthObserver = () => {
            isNewMessageEmpty =
                yFragmentToPlaintext(fragment).trim().length === 0;
        };
        messageLengthObserver();

        fragment.observeDeep(messageLengthObserver);
        return () => fragment.unobserveDeep(messageLengthObserver);
    });

    const onSendMessage = async (e?: Event) => {
        e?.preventDefault();

        const text = cloneYFragment(fragment);
        fragment.delete(0, fragment.length);

        const plaintext = yFragmentToPlaintext(text);
        if (plaintext.trim().length === 0) {
            return;
        }

        agent.createMessage({
            boardId: card.boardId,
            columnId: card.columnId,
            cardId: card.id,
            text: text,
        });

        // Wait for DOM to update and then scroll to bottom
        await tick();
        scrollable?.scrollTo({
            top: scrollable.scrollHeight,
            behavior: 'smooth',
        });
    };

    const separator = (idx: number, length: number) => {
        if (idx === length - 1) {
            return '';
        }
        if (idx === length - 2) {
            if (length === 2) {
                return ' and ';
            } else {
                return ', and ';
            }
        }
        return ', ';
    };
</script>

<div
    class="border-divider bg-surface-0 dark:bg-surface-1 z-10 flex w-full flex-shrink-0 flex-col border-l"
>
    <div
        class="flex items-center px-6 h-[2.325rem] border-b border-transparent"
        class:border-divider-subtle!={isScrolled}
    >
        <div
            class="flex items-center gap-0.5 icon-base select-text font-medium"
        >
            {#if card.isDraft}
                New card
            {:else}
                <HashtagIcon strokeWidth="1.75" />
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
        onscroll={() => {
            isScrolled = scrollable?.scrollTop > 0;
        }}
    >
        <!-- Task Description -->
        <div class="mx-6 mt-1">
            <div
                class="input w-full leading-relaxed transition-colors duration-150"
            >
                <Editor
                    bind:this={editor}
                    placeholder="Description"
                    fragment={card.text.__fragment!}
                    class="min-h-50"
                    {awareness}
                    {me}
                />
            </div>

            <!-- Task Actions -->
            <div class="flex gap-2 my-3 text-sm icon-sm text-ink-body">
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
                    value={card.assignee?.id}
                    options={[
                        {value: undefined, label: 'No assignee'},
                        ...assigneeOptions,
                    ]}
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
        {#await detailsPromise then details}
            <MessageList messages={details.messages} />
        {/await}
    </div>
    {#if card.typingUsers.length > 0}
        <div>
            {#each card.typingUsers as user, idx (idx)}
                {user.fullName}{separator(idx, card.typingUsers.length)}
            {/each}
            {card.typingUsers.length > 1 ? 'are' : 'is'} typing...
        </div>
    {/if}
    <div class="px-6 py-3 flex items-end gap-1 border-t border-divider-subtle">
        <button class="btn--icon bg-surface-2">
            <PlusIcon />
        </button>
        <Editor
            {fragment}
            {me}
            placeholder="Write a message..."
            class="px-1 py-1 w-full"
            onEnter={() => onSendMessage()}
            onKeyDown={() =>
                agent.handleCardMessageKeyDown(card.boardId, card.id)}
            onBlur={() => agent.handleCardMessageBlur(card.boardId, card.id)}
        />

        <button
            type="submit"
            class="btn--icon ml-auto bg-surface-2"
            disabled={isNewMessageEmpty}
        >
            <ArrowUp />
        </button>
    </div>
</div>
