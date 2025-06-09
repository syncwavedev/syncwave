<script lang="ts">
    import type {BoardTreeView, MeView} from '../../agent/view.svelte';
    import {
        panelSizeManager,
        type PanelType,
    } from '../../panel-size-manager.svelte';
    import {getAuthManager} from '../../utils';
    import Avatar from '../components/avatar.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import LogOutIcon from '../components/icons/log-out-icon.svelte';
    import UserRoundCog from '../components/icons/user-round-cog.svelte';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import modalManager from '../modal-manager.svelte';
    import ActivityView from '../activity-view/activity-view.svelte';
    import LeftPanelIcon from '../components/icons/left-panel-icon.svelte';
    import BoardsView from '../boards-view/boards-view.svelte';
    import type {Board} from 'syncwave';
    import HomeIcon from '../components/icons/home-icon.svelte';
    import HomeSolidIcon from '../components/icons/home-solid-icon.svelte';
    import InboxSolidIcon from '../components/icons/inbox-solid-icon.svelte';
    import InboxIcon from '../components/icons/inbox-icon.svelte';

    const {
        me,
        board,
        boards,
    }: {
        me: MeView;
        board: BoardTreeView;
        boards: Board[];
    } = $props();

    const authManager = getAuthManager();

    let activePanel: PanelType | null = $state(null);
</script>

{#snippet profileSettings()}
    <ProfileModal {me} />
{/snippet}

<div
    class="border-r border-divider flex flex-col px-2.5 btn--large"
    class:bg-sidebar={activePanel !== null}
>
    <div class="h-panel-header flex items-center">
        <button class="btn btn--icon">
            <LeftPanelIcon />
        </button>
    </div>
    <button
        class="btn btn--icon btn-margin-block-end"
        onclick={() => {
            activePanel = activePanel === 'boards' ? null : 'boards';
        }}
    >
        {#if activePanel === 'boards'}
            <HomeSolidIcon />
        {:else}
            <HomeIcon />
        {/if}
    </button>
    <button
        class="btn btn--icon"
        onclick={() => {
            activePanel = activePanel === 'activity' ? null : 'activity';
        }}
    >
        {#if activePanel === 'activity'}
            <InboxSolidIcon />
        {:else}
            <InboxIcon />
        {/if}
    </button>

    <!-- Profile menu -->
    <div class="mt-auto flex flex-col items-center mb-4">
        <DropdownMenu
            items={[
                {
                    icon: UserRoundCog,
                    text: 'Profile Settings',
                    onSelect: () => {
                        modalManager.open(profileSettings);
                    },
                },
                {
                    icon: LogOutIcon,
                    text: 'Sign Out',
                    onSelect: () => {
                        const confirmMessage = `Are you sure you want to sign out?`;
                        if (confirm(confirmMessage)) {
                            authManager.logOut();
                        }
                    },
                },
            ]}
        >
            <button class="btn btn--plain">
                <Avatar
                    userId={me.id}
                    imageUrl={me.avatarUrlSmall}
                    name={me.fullName}
                />
            </button>
        </DropdownMenu>
    </div>
</div>

{#if activePanel}
    <ResizablePanel
        class="max-h-full overflow-auto"
        freeSide="right"
        width={panelSizeManager.getWidth(activePanel) ?? 360}
        minWidth={240}
        maxWidth={1600}
        onWidthChange={w => panelSizeManager.setWidth(activePanel!, w)}
    >
        {#if activePanel === 'activity'}
            <ActivityView {board} />
        {:else if activePanel === 'boards'}
            <BoardsView {boards} />
        {/if}
    </ResizablePanel>
{/if}

<style>
    .btn-margin-block-end {
        margin-block-end: calc(
            (var(--panel-header-height) - var(--btn-size)) / 2
        );
    }
</style>
