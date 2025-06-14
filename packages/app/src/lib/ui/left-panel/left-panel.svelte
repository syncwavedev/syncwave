<script lang="ts">
    import type {Board} from 'syncwave';
    import MenuIcon from '../components/icons/menu-icon.svelte';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import UserRoundCog from '../components/icons/user-round-cog.svelte';
    import modalManager from '../modal-manager.svelte';
    import type {MeView} from '../../agent/view.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import LogOutIcon from '../components/icons/log-out-icon.svelte';
    import {getAuthManager} from '../../utils';
    import Avatar from '../components/avatar.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    const {
        me,
        boards,
        onLeftPanelClose,
    }: {
        me: MeView;
        boards: Board[];
        onLeftPanelClose: () => void;
    } = $props();

    const authManager = getAuthManager();
</script>

{#snippet profileSettings()}
    <ProfileModal {me} />
{/snippet}

<div
    class="border-divider border-r flex w-full flex-shrink-0 flex-col bg-sidebar"
>
    <div
        class="flex justify-between items-center px-panel-inline h-panel-header"
    >
        <button class="btn btn--icon btn--bordered" onclick={onLeftPanelClose}>
            <MenuIcon />
        </button>
    </div>
    <div
        class="
        flex
        items-center
        gap-1.5

        mx-panel-inline-half
        px-panel-inline-half
        rounded-md
        hover:bg-material-1-hover
        py-1.5
        my-2.5
      "
    >
        <div class="text-[1.3em] grid place-items-center">
            <PlusIcon />
        </div>
        Create a new board
    </div>
    <div class="flex flex-col flex-1">
        {#each boards as board (board.id)}
            <div
                class="mx-panel-inline-half px-panel-inline-half rounded-md hover:bg-material-1-hover py-1.5"
            >
                {board.name}
            </div>
        {/each}
    </div>
    <!-- Profile menu -->
    <div class="mb-4 px-panel-inline">
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
