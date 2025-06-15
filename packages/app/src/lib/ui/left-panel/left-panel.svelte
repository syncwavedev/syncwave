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
    import ResizablePanel from '../components/resizable-panel.svelte';
    import {panelSizeManager} from '../../panel-size-manager.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusCircleIcon from '../components/icons/plus-circle-icon.svelte';

    const {
        me,
        boards,
    }: {
        me: MeView;
        boards: Board[];
    } = $props();

    const authManager = getAuthManager();

    let collapsed = $state(false);
</script>

{#snippet profileSettings()}
    <ProfileModal {me} />
{/snippet}

<ResizablePanel
    class="max-h-full overflow-auto"
    freeSide="right"
    width={panelSizeManager.getWidth('home') ?? 260}
    minWidth={200}
    maxWidth={1600}
    onWidthChange={w => panelSizeManager.setWidth('home', w)}
    disabled={collapsed}
>
    <div class="border-divider border-r flex w-full flex-shrink-0 flex-col">
        <div class="flex justify-between items-center px-2.5 h-panel-header">
            <button
                class="btn btn--icon btn--bordered"
                onclick={() => (collapsed = !collapsed)}
            >
                <MenuIcon />
            </button>
        </div>
        <div class="flex flex-col flex-1 mt-2.5">
            {#if !collapsed}
                {#each boards as board (board.id)}
                    <div
                        class="flex gap-1.5 mx-panel-inline-half px-panel-inline-half rounded-md hover:bg-material-1-hover py-1.5"
                    >
                        <div class="text-[1.3em] grid place-items-center">
                            <HashtagIcon />
                        </div>
                        {board.name}
                    </div>
                {/each}
            {/if}

            {#if !collapsed}
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
                    "
                >
                    <div class="text-[1.3em] grid place-items-center">
                        <PlusCircleIcon />
                    </div>
                    New board
                </div>
            {/if}
        </div>

        <!-- Profile menu -->
        <div class="mb-4 px-2.5">
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
                <button class="btn btn--icon">
                    <Avatar
                        userId={me.id}
                        imageUrl={me.avatarUrlSmall}
                        name={me.fullName}
                    />
                </button>
            </DropdownMenu>
        </div>
    </div>
</ResizablePanel>
