<script lang="ts">
    import {Awareness} from 'syncwave';
    import BoardScreen from '../lib/ui/boards/board-screen.svelte';
    import PermissionBoundary from '../lib/ui/components/permission-boundary.svelte';
    import type {
        BoardTreeView,
        MemberView,
        MeView,
    } from '../lib/agent/view.svelte';

    const {
        board,
        awareness,
        boardMeView,
        me,
        counter,
    }: {
        board: BoardTreeView;
        awareness: Awareness;
        me: MeView;
        boardMeView: MemberView;
        counter?: number;
    } = $props();
</script>

<PermissionBoundary member={boardMeView}>
    <BoardScreen {board} {awareness} {me} {boardMeView} {counter} />
</PermissionBoundary>
