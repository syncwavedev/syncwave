<script lang="ts">
    import Modal from '../Modal.svelte';
    import type {BoardTreeView, MeView} from '../../agent/view.svelte';
    import UsersIcon from '../icons/UsersIcon.svelte';
    import ColumnsIcon from '../icons/ColumnsIcon.svelte';
    import CogIcon from '../icons/CogIcon.svelte';
    import CogSolidIcon from '../icons/CogSolidIcon.svelte';
    import UsersSolidIcon from '../icons/UsersSolidIcon.svelte';
    import ColumnsSolidIcon from '../icons/ColumnsSolidIcon.svelte';
    import BoardSettingsGeneral from './BoardSettingsGeneral.svelte';
    import BoardSettingsMembers from './BoardSettingsMembers.svelte';
    import BoardSettingsColumns from './BoardSettingsColumns.svelte';

    let {board, me}: {board: BoardTreeView; me: MeView} = $props();

    let selectedTab: 'general' | 'members' | 'columns' = $state('general');
</script>

<Modal size="xl">
    <p class="mt-3 mb-4 font-semibold text-center text-lg">Board Settings</p>
    <div class="flex justify-center items-center tab__icon">
        <button
            class="flex flex-col items-center gap-0.5 icon-lg py-2 px-4 rounded-md hover:bg-material-elevated-hover"
            onclick={() => (selectedTab = 'general')}
            class:text-ink-body={selectedTab !== 'general'}
        >
            {#if selectedTab === 'general'}
                <CogSolidIcon />
            {:else}
                <CogIcon />
            {/if}

            <span class="text-sm">General</span>
        </button>
        <button
            class="flex flex-col items-center gap-0.5 icon-lg py-2 px-4 rounded-md hover:bg-material-elevated-hover"
            onclick={() => (selectedTab = 'members')}
            class:text-ink-body={selectedTab !== 'members'}
        >
            {#if selectedTab === 'members'}
                <UsersSolidIcon />
            {:else}
                <UsersIcon />
            {/if}
            <span class="text-sm">Members</span>
        </button>
        <button
            class="flex flex-col items-center gap-0.5 icon-lg py-2 px-4 rounded-md hover:bg-material-elevated-hover"
            onclick={() => (selectedTab = 'columns')}
            class:text-ink-body={selectedTab !== 'columns'}
        >
            {#if selectedTab === 'columns'}
                <ColumnsSolidIcon />
            {:else}
                <ColumnsIcon />
            {/if}
            <span class="text-sm">Columns</span>
        </button>
    </div>
    <hr class="mt-1 material-elevated" />
    {#if selectedTab === 'general'}
        <BoardSettingsGeneral {board} />
    {:else if selectedTab === 'members'}
        <BoardSettingsMembers {board} {me} />
    {:else if selectedTab === 'columns'}
        <BoardSettingsColumns {board} />
    {/if}
</Modal>

<style>
    .tab__icon {
        --icon-size: 1.5em;
    }
</style>
