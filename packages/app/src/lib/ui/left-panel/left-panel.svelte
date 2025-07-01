<script lang="ts">
    import type {Board} from 'syncwave';
    import DropdownMenu from '../components/dropdown-menu.svelte';
    import UserRoundCog from '../components/icons/user-round-cog.svelte';
    import modalManager from '../modal-manager.svelte';
    import type {MeView} from '../../agent/view.svelte';
    import ProfileModal from '../profiles/profile-modal.svelte';
    import LogOutIcon from '../components/icons/log-out-icon.svelte';
    import {getAuthManager} from '../../utils';
    import Avatar from '../components/avatar.svelte';
    import ResizablePanel from '../components/resizable-panel.svelte';
    import {panelSizeManager} from '../../panel-size-manager.svelte';
    import LeftPanelIcon from '../components/icons/left-panel-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';

    const {
        me,
        boards,
        onBoardClick,
        onNewBoard,
        selectedKey,
        onClose,
    }: {
        me: MeView;
        boards: Board[];
        onBoardClick: (key: string) => void;
        onNewBoard: () => void;
        onClose: () => void;
        selectedKey: string | undefined;
    } = $props();

    const authManager = getAuthManager();
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
>
    <div class="border-divider border-r flex w-full flex-shrink-0 flex-col">
        <div
            class="flex justify-between items-center mx-panel-inline h-panel-header"
        >
            <button class="btn btn--icon" onclick={onClose}>
                <LeftPanelIcon />
            </button>
        </div>

        <div class="flex">
            <button
                class="
                    flex
                    flex-1
                    gap-1
                    items-center
                    hover:bg-material-base-hover
                    rounded-md
                    py-1.5
                    px-panel-inline-half
                    mx-panel-inline-half
                    my-3
                    "
                onclick={onNewBoard}
                class:board--active={selectedKey === 'new-board'}
            >
                <span class="text-[1.4em]"><PlusIcon /></span>
                New board
            </button>
        </div>

        <div class="flex flex-col flex-1 text-ink-body">
            {#each boards as board (board.id)}
                <button
                    class="flex gap-1.5 mx-panel-inline-half px-panel-inline-half rounded-md hover:bg-material-base-hover py-1.5"
                    class:board--active={selectedKey === board.key}
                    onclick={() => onBoardClick(board.key)}
                >
                    {board.name}
                </button>
            {/each}
        </div>

        <!-- Profile menu -->
        <div class="mb-4 mx-panel-inline">
            <DropdownMenu
                side="right"
                align="end"
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

<style>
    .board--active {
        background-color: var(--color-material-1-hover);
        color: var(--color-ink);
    }
</style>
