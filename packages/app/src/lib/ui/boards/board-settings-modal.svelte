<script lang="ts">
    import Modal from '../components/modal.svelte';
    import type {BoardTreeView, MeView} from '../../agent/view.svelte';
    import UsersIcon from '../components/icons/users-icon.svelte';
    import ColumnsIcon from '../components/icons/columns-icon.svelte';
    import CogIcon from '../components/icons/cog-icon.svelte';
    import CogSolidIcon from '../components/icons/cog-solid-icon.svelte';
    import UsersSolidIcon from '../components/icons/users-solid-icon.svelte';
    import ColumnsSolidIcon from '../components/icons/columns-solid-icon.svelte';
    import BoardSettingsGeneral from './board-settings-general.svelte';
    import BoardSettingsMembers from './board-settings-members.svelte';
    import BoardSettingsColumns from './board-settings-columns.svelte';

    let {board, me}: {board: BoardTreeView; me: MeView} = $props();

    let selectedTab: 'general' | 'members' | 'columns' = $state('general');
</script>

<Modal size="xl">
    <p class="mt-3 mb-4 font-semibold text-center">Board Settings</p>
    <div class="flex justify-center items-center">
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

            <span class="text-xs">General</span>
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
            <span class="text-xs">Members</span>
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
            <span class="text-xs">Columns</span>
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
