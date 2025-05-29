<script lang="ts">
    import type {BoardTreeView} from '../../agent/view.svelte';
    import ActivityIcon from '../components/icons/activity-icon.svelte';
    import LeftPanelIcon from '../components/icons/left-panel-icon.svelte';
    import MenuSearchIcon from '../components/icons/menu-search-icon.svelte';
    import ActivityItemCreated from './activity-item-created.svelte';
    import ActivityItemMoved from './activity-item-moved.svelte';

    interface Props {
        board: BoardTreeView;
    }

    let {board}: Props = $props();
</script>

<div
    class="border-divider border-r z-10 flex w-full flex-shrink-0 flex-col bg-gray-925"
>
    <div
        class="panel-header-height px-[calc(var(--panel-padding-inline)/2)] gap-1 font-medium flex items-center"
    >
        <button class="btn menu--btn text-ink-body">
            <MenuSearchIcon />
        </button>
        <button class="btn menu--btn menu--btn--active text-ink-body">
            <ActivityIcon />
        </button>
        <button class="btn menu--btn text-ink-body ml-auto">
            <LeftPanelIcon />
        </button>
    </div>
    <div
        class="overflow-y-auto no-scrollbar flex flex-col flex-1 px-[calc(var(--panel-padding-inline)/2)] py-1"
    >
        {#each board.unreadMessages as message (message.id)}
            {#if message.payload.type === 'card_column_changed'}
                <ActivityItemMoved {message} />
            {/if}
            {#if message.payload.type === 'card_created'}
                <ActivityItemCreated {message} />
            {/if}
        {/each}

        <!-- <div class="flex items-center">
            <div class="h-[1px] bg-divider flex-1"></div>
            <div
                class="text-center my-2 text-ink-body text-xs bg-material-1 px-1 py-0.5 rounded-sm"
            >
                New activities
            </div>
            <div class="h-[1px] bg-divider flex-1"></div>
        </div> -->
    </div>
</div>

<style>
    .menu--btn {
        display: grid;
        aspect-ratio: 1/1;
        place-items: center;
        height: 2.25em;
        width: 2.25em;
        border-radius: var(--radius-md);

        &.menu--btn--active {
            color: var(--color-primary);
        }

        &:hover {
            background-color: var(--color-gray-1050);
        }
    }
</style>
