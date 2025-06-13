<script lang="ts">
    import {MeViewDataDto} from 'syncwave';

    import {getAgent} from '../lib/agent/agent.svelte';
    import BoardHistoryManager from '../lib/board-history-manager';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import BoardLoader from '../lib/ui/boards/board-loader.svelte';
    import ResizablePanel from '../lib/ui/components/resizable-panel.svelte';
    import {panelSizeManager} from '../lib/panel-size-manager.svelte';
    import LeftPanel from '../lib/ui/left-panel/left-panel.svelte';

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

    function getDefaultBoardKey(): string | undefined {
        const lastKey = BoardHistoryManager.last();

        // The last board can be deleted, or user access can be revoked
        if (lastKey && me.boards.some(b => b.key === lastKey)) {
            return lastKey;
        }

        return me.boards[0].key;
    }

    const selectedKey = $state(key ?? getDefaultBoardKey());

    // Save the selected board key to history on change
    $effect(() => {
        if (selectedKey) {
            BoardHistoryManager.save(selectedKey);
        }
    });

    const me = agent.observeMe(meData);

    let leftPanelActive = $state(true);
</script>

<div class="flex h-full">
    {#if leftPanelActive}
        <ResizablePanel
            class="max-h-full overflow-auto"
            freeSide="right"
            width={panelSizeManager.getWidth('home') ?? 260}
            minWidth={200}
            maxWidth={1600}
            onWidthChange={w => panelSizeManager.setWidth('home', w)}
        >
            <LeftPanel
                {me}
                boards={me.boards}
                onLeftPanelClose={() => (leftPanelActive = false)}
            />
        </ResizablePanel>
    {/if}
    {#if selectedKey}
        {#await agent.getBoardViewData(selectedKey)}
            {@const board = me.boards.find(b => b.key === selectedKey)}
            {#if board}
                <BoardLoader {board} />
            {:else}
                <div class="flex flex-col items-center justify-center h-full">
                    <p class="text-gray-500">Board not found</p>
                </div>
            {/if}
        {:then [boardData, meBoardData]}
            <BoardScreen
                {me}
                {boardData}
                {meBoardData}
                {counter}
                onLeftPanelOpen={() => (leftPanelActive = true)}
                hideLeftPanelButton={leftPanelActive === true}
            />
        {/await}
    {/if}
</div>
