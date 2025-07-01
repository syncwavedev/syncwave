<script lang="ts">
    import {MeViewDataDto} from 'syncwave';

    import {getAgent} from '../lib/agent/agent.svelte';
    import BoardHistoryManager from '../lib/board-history-manager';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import BoardLoader from '../lib/ui/boards/board-loader.svelte';
    import LeftPanel from '../lib/ui/left-panel/left-panel.svelte';
    import NewBoardScreen from '../lib/ui/boards/new-board-screen.svelte';

    type View = {type: 'board'; key: string} | {type: 'new-board'};

    const {
        meData,
        counter,
        key,
    }: {
        meData: MeViewDataDto;
        counter?: number;
        key?: string;
    } = $props();

    const agent = getAgent();
    const me = agent.observeMe(meData);

    function getDefaultBoardKey(): string | undefined {
        const lastKey = BoardHistoryManager.last();

        // The last board can be deleted, or user access can be revoked
        if (lastKey && me.boards.some(b => b.key === lastKey)) {
            return lastKey;
        }

        return me.boards[0]?.key;
    }

    function getInitialView(): View {
        const boardKey = key ?? getDefaultBoardKey();
        return boardKey ? {type: 'board', key: boardKey} : {type: 'new-board'};
    }

    let currentView = $state<View>(getInitialView());
    let leftPanelOpen = $state(true);

    let currentBoardKey = $derived(
        currentView.type === 'board' ? currentView.key : undefined
    );

    let currentBoard = $derived(
        currentBoardKey
            ? me.boards.find(b => b.key === currentBoardKey)
            : undefined
    );

    $effect(() => {
        if (currentView.type === 'board') {
            BoardHistoryManager.save(currentView.key);
        }
    });

    function navigateToBoard(key: string) {
        currentView = {type: 'board', key};
    }

    function navigateToNewBoard() {
        currentView = {type: 'new-board'};
    }

    function openLeftPanel() {
        leftPanelOpen = true;
    }

    function closeLeftPanel() {
        leftPanelOpen = false;
    }
</script>

<div class="flex h-full">
    {#if leftPanelOpen}
        <LeftPanel
            {me}
            boards={me.boards}
            onBoardClick={navigateToBoard}
            onNewBoard={navigateToNewBoard}
            onClose={closeLeftPanel}
            selectedKey={currentView.type === 'board'
                ? currentView.key
                : 'new-board'}
        />
    {/if}

    {#if currentView.type === 'new-board'}
        <NewBoardScreen onBoardCreated={navigateToBoard} />
    {:else if currentView.type === 'board'}
        {#await agent.getBoardViewData(currentView.key)}
            {#if currentBoard}
                <BoardLoader board={currentBoard} />
            {/if}
        {:then [boardData, meBoardData]}
            <BoardScreen
                {me}
                {boardData}
                {meBoardData}
                {counter}
                hideLeftPanel={leftPanelOpen}
                onOpenLeftPanel={openLeftPanel}
            />
        {/await}
    {/if}
</div>
