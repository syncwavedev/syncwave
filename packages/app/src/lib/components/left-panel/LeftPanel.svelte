<script lang="ts">
    import type {Board} from 'syncwave';
    import modalManager from '../../managers/modal-manager.svelte';
    import type {MeView} from '../../agent/view.svelte';
    import {getAuthManager} from '../../utils/utils';
    import {panelSizeManager} from '../../managers/panel-size-manager.svelte';
    import UserRoundCog from '../icons/UserRoundCog.svelte';
    import Dropdown from '../Dropdown.svelte';
    import Avatar from '../Avatar.svelte';
    import LogOutIcon from '../icons/LogOutIcon.svelte';
    import ResizablePanel from '../ResizablePanel.svelte';
    import ArrowLeftFromLineIcon from '../icons/ArrowLeftFromLineIcon.svelte';
    import PlusSquareIcon from '../icons/PlusSquareIcon.svelte';
    import ChatBubbleSolidIcon from '../icons/ChatBubbleSolidIcon.svelte';
    import ProfileModal from '../ProfileModal.svelte';

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

{#snippet profileMenu()}
    <Dropdown placement="bottom-start">
        {#snippet trigger()}
            <div class="btn btn--icon">
                <Avatar
                    userId={me.id}
                    imageUrl={me.avatarUrlSmall}
                    name={me.fullName}
                />
            </div>
        {/snippet}
        <button
            type="button"
            class="dropdown__item"
            onclick={() => modalManager.open(profileSettings)}
        >
            <UserRoundCog /> Profile Settings
        </button>
        <button
            type="button"
            class="dropdown__item"
            onclick={() => {
                const confirmMessage = `Are you sure you want to sign out?`;
                if (confirm(confirmMessage)) {
                    authManager.logOut();
                }
            }}
        >
            <LogOutIcon /> Sign Out
        </button>
    </Dropdown>
{/snippet}

<ResizablePanel
    class="max-h-full"
    freeSide="right"
    width={panelSizeManager.getWidth('home') ?? 260}
    minWidth={200}
    maxWidth={1600}
    onWidthChange={w => panelSizeManager.setWidth('home', w)}
>
    <div
        class="border-divider border-r flex w-full flex-shrink-0 flex-col bg-sidebar"
    >
        <div
            class="flex justify-between items-center mx-panel-inline h-panel-header"
        >
            {@render profileMenu()}
            <button class="btn btn--icon" onclick={onClose}>
                <ArrowLeftFromLineIcon />
            </button>
        </div>

        <div class="flex flex-col flex-1 text-ink-body mt-3">
            {#each boards as board (board.id)}
                <button
                    class="flex items-center gap-1.5 mx-panel-inline-half px-panel-inline-half rounded-md hover:bg-material-base-hover py-1.5 item__icon"
                    class:board--active={selectedKey === board.key}
                    onclick={() => onBoardClick(board.key)}
                >
                    {board.name}
                </button>
            {/each}
        </div>
        <div class="mx-panel-inline-half">
            <button
                class="btn"
                onclick={onNewBoard}
                class:board--active={selectedKey === 'new-board'}
            >
                <PlusSquareIcon />
                New Board
            </button>
        </div>
        <hr class="my-2" />
        <div class="mx-panel-inline-half">
            <div class="mb-2">
                <a
                    href="https://discord.gg/FzQjQVFdQz"
                    class="btn"
                    target="_blank"
                >
                    <ChatBubbleSolidIcon /> Leave Feedback
                </a>
            </div>
        </div>
    </div>
</ResizablePanel>

<style>
    .item__icon {
        --icon-size: 1.4em;
    }

    .board--active {
        background-color: var(--color-material-1-hover);
        color: var(--color-ink);
    }
</style>
