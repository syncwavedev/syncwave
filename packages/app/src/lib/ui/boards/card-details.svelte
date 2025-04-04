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

    onMount(() => {
        tick().then(() => {
            if (card.isDraft && editor) {
                editor.focus();
            }
        });
    });
</script>

<div
    class="border-divider bg-surface-0 z-10 flex w-full flex-shrink-0 flex-col border-l"
>
    <!-- Scrollable Content Section -->
    <div class="flex-grow overflow-y-auto">
        <!-- Header with Context Menu -->
        <div
            class="bg-surface-0 border-divider sticky top-0 z-20 flex items-center px-4 py-2 text-xs icon-xs"
        >
            <div class="flex items-center gap-0.5 icon-base">
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
                                navigator.clipboard.writeText(
                                    window.location.href
                                );
                            },
                        },
                        {
                            icon: TrashIcon,
                            text: 'Delete',
                            onSelect: () => onDelete(),
                        },
                    ]}
                >
                    <button class="btn--icon" id="ellipsis-button">
                        <EllipsisIcon />
                    </button>
                </DropdownMenu>
            </div>
            <button class="btn--icon" onclick={() => history.back()}>
                <TimesIcon />
            </button>
        </div>
        <!-- Task Description -->
        <div class="mx-2">
            <div
                class="input w-full text-sm leading-relaxed py-1 px-2 rounded-sm transition-colors duration-150"
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
        </div>
        <!-- Task Actions -->
        <div class="mx-4 mt-3">
            <div class="flex gap-2">
                <Select
                    value={card.column.id}
                    options={columnOptions}
                    onValueChange={value =>
                        agent.setCardColumn(card.id, value as ColumnId)}
                >
                    <button class="btn-tinted text-2xs icon-2xs">
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
                    <button class="btn-tinted text-2xs icon-2xs">
                        <UserIcon />
                        {card.assignee?.fullName ?? 'Assignee'}
                    </button>
                </Select>
            </div>
        </div>
        <hr class="mt-3 mb-2" />
    </div>
</div>
