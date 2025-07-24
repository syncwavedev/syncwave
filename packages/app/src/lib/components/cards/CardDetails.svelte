<script lang="ts">
    import EllipsisIcon from '../icons/EllipsisIcon.svelte';
    import LinkIcon from '../icons/LinkIcon.svelte';
    import TrashIcon from '../icons/TrashIcon.svelte';
    import TimesIcon from '../icons/TimesIcon.svelte';
    import CircleDashedIcon from '../icons/CircleDashedIcon.svelte';
    import Editor from '../Editor.svelte';
    import type {CardTreeView, MemberView} from '../../agent/view.svelte';
    import type {Awareness, ColumnId, UserId} from 'syncwave';
    import {onMount, tick} from 'svelte';
    import HashtagIcon from '../icons/HashtagIcon.svelte';
    import Dropdown from '../Dropdown.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import {getNow} from 'syncwave';
    import Avatar from '../Avatar.svelte';
    import UsersSolidIcon from '../icons/UsersSolidIcon.svelte';
    import Select from '../Select.svelte';

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
</script>

<div class="border-divider flex w-full flex-shrink-0 flex-col border-l">
    <div
        class="
        flex
        items-center
        justify-between
        shrink-0
        h-panel-header
        border-b
        border-divider
        px-panel-inline
        "
    >
        <div class="flex items-center">
            {#if card.isDraft}
                New card
            {:else}
                <Dropdown placement="bottom-start">
                    {#snippet trigger()}
                        <div class="dropdown__item" id="ellipsis-button">
                            No. {card.counter}
                            <EllipsisIcon />
                        </div>
                    {/snippet}
                    <button
                        type="button"
                        class="dropdown__item"
                        onclick={() => {
                            navigator.clipboard.writeText(
                                card.counter?.toString() ?? 'N/A'
                            );
                        }}
                    >
                        <HashtagIcon /> Copy Card Number
                    </button>
                    <button
                        type="button"
                        class="dropdown__item"
                        onclick={() => {
                            navigator.clipboard.writeText(window.location.href);
                        }}
                    >
                        <LinkIcon /> Copy Card Link
                    </button>
                    <button
                        type="button"
                        class="dropdown__item"
                        onclick={() => {
                            onDelete();
                        }}
                    >
                        <TrashIcon /> Delete Card
                    </button>
                </Dropdown>
            {/if}
        </div>
        <div class="relative ml-auto"></div>
        <button class="btn btn--icon ml-1" onclick={() => history.back()}>
            <TimesIcon />
        </button>
    </div>
    <!-- Task Actions -->
    <div class="flex gap-3 items-center mx-6 my-3">
        <Select
            value={card.column.id}
            options={columnOptions}
            onValueChange={value =>
                agent.setCardColumn(card.id, value as ColumnId)}
        >
            <button class="btn btn--plain">
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
            <button class="btn btn--plain">
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

    <!-- Scrollable Content Section -->
    <div class="overflow-y-auto no-scrollbar flex flex-col flex-1">
        <!-- Task Description -->
        <div class="px-8 pb-8 pt-8 text-xl">
            <div
                class="input input--text-area flex-grow w-full leading-relaxed"
            >
                <Editor
                    bind:this={editor}
                    placeholder="Description"
                    fragment={card.text.__fragment!}
                    {awareness}
                    me={{
                        fullName: me.fullName,
                        color: me.color,
                    }}
                />
            </div>
        </div>
        <div class="flex items-center gap-2 mx-8">
            <p class="text-ink-detail">
                {card.messages.length} Activities
            </p>
            <div class="h-[1px] flex-1 bg-divider"></div>
        </div>
    </div>
</div>
