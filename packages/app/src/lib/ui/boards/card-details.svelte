<script lang="ts">
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import LinkIcon from '../components/icons/link-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import TimesIcon from '../components/icons/times-icon.svelte';
    import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
    import Editor from '../components/editor.svelte';
    import type {CardTreeView, MemberView} from '../../agent/view.svelte';
    import type {Awareness} from 'syncwave';
    import type {ColumnId, UserId} from 'syncwave';
    import {onDestroy, onMount, tick} from 'svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import Select from '../components/select.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import {
        cloneYFragment,
        createXmlFragment,
        getNow,
        yFragmentToPlaintext,
    } from 'syncwave';
    import MessageList from '../messages/message-list.svelte';
    import Avatar from '../components/avatar.svelte';
    import UsersSolidIcon from '../components/icons/users-solid-icon.svelte';

    const {
        card,
        awareness,
        me,
        columnOptions,
        assigneeOptions,
        onDelete,
    }: {
        card: CardTreeView;
        awareness: Awareness;
        me: MemberView;
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

        const now = getNow();
        card.messages.forEach(message => {
            if (!message.readByMeAt) {
                agent.markMessageAsRead(message.id, now);
            }
        });
    });

    const fragment = createXmlFragment();

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

    // don't autoscroll after loading the card
    let wasAtBottom = false;
    const THRESHOLD = 5; // px
    let smoothScrollTimeout: number | null = null;
    function setSmoothScrollTimeout() {
        if (smoothScrollTimeout) {
            clearTimeout(smoothScrollTimeout);
        }
        // if there are no scroll events for 100ms, we can assume that the smooth scroll has finished
        smoothScrollTimeout = setTimeout(() => {
            smoothScrollTimeout = null;
        }, 100) as unknown as number;
    }
    function handleScroll() {
        if (smoothScrollTimeout) {
            // prolong the timeout
            setSmoothScrollTimeout();
            return;
        }

        const {scrollTop, scrollHeight, clientHeight} = scrollable;
        wasAtBottom = scrollHeight - (scrollTop + clientHeight) < THRESHOLD;
    }

    onMount(() => {
        scrollable.addEventListener('scroll', handleScroll, {passive: true});
    });

    onDestroy(() => {
        scrollable.removeEventListener('scroll', handleScroll);
    });

    $effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _trackedMessagesCount = card.messages.length;

        if (wasAtBottom) {
            scrollable.scrollTo({
                top: scrollable.scrollHeight,
                behavior: 'smooth',
            });
            setSmoothScrollTimeout();
        }
    });

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

<div class="border-divider z-10 flex w-full flex-shrink-0 flex-col border-l">
    <div
        class="flex items-center justify-between shrink-0 h-panel-header px-panel-inline"
    >
        <div class="flex items-center gap-0.5 font-semibold icon--bold">
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
                <button
                    class="btn btn--icon btn--bordered"
                    id="ellipsis-button"
                >
                    <EllipsisIcon />
                </button>
            </DropdownMenu>
        </div>
        <button
            class="btn btn--icon btn--bordered ml-2"
            onclick={() => history.back()}
        >
            <TimesIcon />
        </button>
    </div>
    <!-- Scrollable Content Section -->
    <div
        bind:this={scrollable}
        class="overflow-y-auto no-scrollbar flex flex-col flex-1"
    >
        <!-- Task Description -->
        <div class="mx-panel-inline mt-4 text-lg">
            <div
                class="input input--text-area flex-grow w-full leading-relaxed"
            >
                <Editor
                    bind:this={editor}
                    placeholder="Description"
                    fragment={card.text.__fragment!}
                    class="min-h-30"
                    {awareness}
                    me={{
                        fullName: me.fullName,
                        color: me.color,
                    }}
                />
            </div>
        </div>
        <!-- Task Actions -->
        <div
            class="flex gap-1.5 mx-panel-inline mt-8 mb-2 items-center text-sm"
        >
            <Select
                value={card.column.id}
                options={columnOptions}
                onValueChange={value =>
                    agent.setCardColumn(card.id, value as ColumnId)}
            >
                <button class="btn">
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
                    agent.setCardAssignee(
                        card.id,
                        (value as UserId) || undefined // select doesn't support undefined, it will return '' instead
                    )}
            >
                <button class="btn">
                    {#if card.assignee}
                        <Avatar
                            userId={card.assignee.id}
                            name={card.assignee.fullName}
                            imageUrl={card.assignee.avatarUrlSmall}
                            class="avatar--x-small"
                        />
                    {:else}
                        <UsersSolidIcon />
                    {/if}
                    {card.assignee?.fullName ?? 'Assignee'}
                </button>
            </Select>
        </div>
        <hr />
        <div class="my-2 text-lg">
            <MessageList messages={card.messages} />
        </div>
    </div>
    {#if card.typingUsers.length > 0}
        <div>
            {#each card.typingUsers as user, idx (idx)}
                {user.fullName}{separator(idx, card.typingUsers.length)}
            {/each}
            {card.typingUsers.length > 1 ? 'are' : 'is'} typing...
        </div>
    {/if}
    <div
        class="
        border
        border-divider-object
        rounded-md
        m-panel-inline
        p-panel-inline-half
        text-lg
        focus-within:outline-[1.5px]
        focus-within:outline-ink
        focus-within:-outline-offset-[-2px]
        "
    >
        <Editor
            {fragment}
            {me}
            placeholder="Write a message..."
            class="px-1 w-full leading-relaxed"
            onEnter={() => onSendMessage()}
            onKeyDown={() =>
                agent.handleCardMessageKeyDown(card.boardId, card.id)}
            onBlur={() => agent.handleCardMessageBlur(card.boardId, card.id)}
        />
    </div>
</div>
