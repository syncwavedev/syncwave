<script lang="ts">
    import {
        BoardViewDataDto,
        CrdtDiff,
        MeViewDataDto,
        User,
        type UserId,
    } from 'syncwave';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import PermissionBoundary from '../lib/ui/components/permission-boundary.svelte';

    import {getAgent} from '../lib/agent/agent.svelte';

    const {
        boardData,
        meBoardData,
        meData,
        counter,
    }: {
        boardData: BoardViewDataDto;
        meBoardData: {
            id: UserId;
            state: CrdtDiff<User>;
        };
        meData: MeViewDataDto;
        counter?: number;
    } = $props();

    const agent = getAgent();

    const [board, awareness, boardMeView] = agent.observeBoard(
        boardData,
        meBoardData
    );
    const me = agent.observeMe(meData);
</script>

<PermissionBoundary member={boardMeView}>
    <BoardScreen {board} {awareness} {me} {boardMeView} {counter} />
</PermissionBoundary>
