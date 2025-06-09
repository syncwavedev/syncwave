<script lang="ts">
    import type {MeView} from '../../agent/view.svelte';
    import {panelSizeManager} from '../../panel-size-manager.svelte';
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
    import HomeIcon from '../components/icons/home-icon.svelte';
    import HomeSolidIcon from '../components/icons/home-solid-icon.svelte';
    import InboxSolidIcon from '../components/icons/inbox-solid-icon.svelte';
    import InboxIcon from '../components/icons/inbox-icon.svelte';

    let {
        me,
        activePanel = $bindable(null),
    }: {
        me: MeView;
        activePanel: 'inbox' | 'home' | null;
    } = $props();

    const authManager = getAuthManager();
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
            activePanel = activePanel === 'home' ? null : 'home';
        }}
    >
        {#if activePanel === 'home'}
            <HomeSolidIcon />
        {:else}
            <HomeIcon />
        {/if}
    </button>
    <button
        class="btn btn--icon"
        onclick={() => {
            activePanel = activePanel === 'inbox' ? null : 'inbox';
        }}
    >
        {#if activePanel === 'inbox'}
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

<style>
    .btn-margin-block-end {
        margin-block-end: calc(
            (var(--panel-header-height) - var(--btn-size)) / 2
        );
    }
</style>
