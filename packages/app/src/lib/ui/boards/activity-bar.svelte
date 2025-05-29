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
    import MenuSearchIcon from '../components/icons/menu-search-icon.svelte';
    import UserRoundCog from '../components/icons/user-round-cog.svelte';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import ActivityPanel from './activity-panel.svelte';
    import modalManager from '../modal-manager.svelte';

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

<div class="border-r border-divider icon-lg flex flex-col px-2.25">
    <div class="panel-header-height flex items-center">
        <button class="btn--icon text-ink-body">
            <MenuSearchIcon />
        </button>
    </div>
    <div class="flex flex-col justify-between items-center flex-1 pt-2 pb-4">
        <button
            class="btn--icon text-ink-body"
            class:text-primary={activePanel === 'activity'}
            onclick={() => {
                activePanel = activePanel === 'activity' ? null : 'activity';
            }}
        >
            <ActivityIcon />
        </button>
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
            <button class="btn--icon mt-auto">
                <Avatar
                    userId={me.id}
                    imageUrl={me.avatarUrlSmall}
                    name={me.fullName}
                />
            </button>
        </DropdownMenu>
    </div>
</div>

{#if activePanel && activePanel === 'activity'}
    <ResizablePanel
        class="max-h-full overflow-auto"
        freeSide="right"
        width={panelSizeManager.getWidth('activity') ?? 360}
        minWidth={320}
        maxWidth={1600}
        onWidthChange={w => panelSizeManager.setWidth('activity', w)}
    >
        <ActivityPanel {board} />
    </ResizablePanel>
{/if}
