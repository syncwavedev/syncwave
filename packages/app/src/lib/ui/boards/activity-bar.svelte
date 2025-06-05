<script lang="ts">
    import type {BoardTreeView, MeView} from '../../agent/view.svelte';
    import {
        panelSizeManager,
        type PanelType,
    } from '../../panel-size-manager.svelte';
    import {getAuthManager} from '../../utils';
    import Avatar from '../components/avatar.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import ActivityIcon from '../components/icons/activity-icon.svelte';
    import LogOutIcon from '../components/icons/log-out-icon.svelte';
    import UserRoundCog from '../components/icons/user-round-cog.svelte';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import modalManager from '../modal-manager.svelte';
    import ActivityView from '../activity-view/activity-view.svelte';
    import FoldersIcon from '../components/icons/folders-icon.svelte';
    import LeftPanelIcon from '../components/icons/left-panel-icon.svelte';

    const {
        me,
        board,
    }: {
        me: MeView;
        board: BoardTreeView;
    } = $props();

    const authManager = getAuthManager();

    let activePanel: PanelType | null = $state(null);
</script>

{#snippet profileSettings()}
    <ProfileModal {me} />
{/snippet}

<div
    class="border-r border-divider flex flex-col px-1.5 text-ink-body"
    class:bg-sidebar={activePanel !== null}
>
    <div class="h-panel-header flex items-center">
        <button class="btn menu--btn">
            <LeftPanelIcon />
        </button>
    </div>
    <button class="btn menu--btn mb-1.5">
        <FoldersIcon />
    </button>
    <button
        class="btn menu--btn"
        class:menu--btn--active={activePanel === 'activity'}
        onclick={() => {
            activePanel = activePanel === 'activity' ? null : 'activity';
        }}
    >
        <ActivityIcon />
    </button>
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
            <button class="btn">
                <Avatar
                    userId={me.id}
                    imageUrl={me.avatarUrlSmall}
                    name={me.fullName}
                />
            </button>
        </DropdownMenu>
    </div>
</div>

{#if activePanel === 'activity'}
    <ResizablePanel
        class="max-h-full overflow-auto"
        freeSide="right"
        width={panelSizeManager.getWidth('activity') ?? 360}
        minWidth={240}
        maxWidth={1600}
        onWidthChange={w => panelSizeManager.setWidth('activity', w)}
    >
        <ActivityView {board} />
    </ResizablePanel>
{/if}

<style>
    .menu--btn {
        display: flex;
        align-items: center;
        height: 1.8rem;
        width: 2.25rem;
        border-radius: var(--radius-md);

        &.menu--btn--active {
            background-color: var(--color-material-1-hover);
        }

        &:hover {
            background-color: var(--color-material-1-hover);
        }
    }
</style>
