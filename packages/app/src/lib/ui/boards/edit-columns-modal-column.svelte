<script lang="ts">
    import {getNow} from 'syncwave';
    import {getAgent} from '../../agent/agent.svelte';
    import type {BoardTreeView, ColumnTreeView} from '../../agent/view.svelte';
    import ColumnIcon from '../components/column-icon.svelte';
    import GripHorizontalIcon from '../components/icons/grip-horizontal-icon.svelte';
    import TrashIcon from '../components/icons/trash-icon.svelte';
    import {
        DND_REORDER_DURATION_MS,
        getDndColumnListContext,
        type Ref,
    } from './column-dnd';

    interface Props {
        column: ColumnTreeView;
        board: BoardTreeView;
        index: number;
    }

    let {column, board, index}: Props = $props();

    let containerRef: HTMLDivElement | null = $state(null);
    let handleRef: HTMLSpanElement | null = $state(null);
    let columnRef: Ref<ColumnTreeView> = {value: column};
    $effect(() => {
        columnRef.value = column;
    });

    const context = getDndColumnListContext();
    $effect(() => {
        if (containerRef && handleRef) {
            return context.registerColumn({
                column: columnRef,
                container: containerRef,
                handle: handleRef,
                cleanups: [],
            });
        }

        return undefined;
    });

    const agent = getAgent();

    function deleteColumn(column: ColumnTreeView) {
        if (
            !confirm(
                `Are you sure you want to delete this column ${column.name}?`
            )
        ) {
            return;
        }
        agent.deleteColumn(column.id);
    }

    const SETTLED_MS = DND_REORDER_DURATION_MS / 2;
    let isDndSettled = $state(
        !!column.dndLastChangeAt &&
            getNow() - column.dndLastChangeAt < SETTLED_MS
    );
    $effect(() => {
        if (column.dndLastChangeAt === undefined) return;
        isDndSettled = false;
        const timeoutId = setTimeout(
            () => {
                isDndSettled = true;
            },
            Math.max(0, column.dndLastChangeAt + SETTLED_MS - getNow())
        );

        return () => {
            isDndSettled = false;
            clearTimeout(timeoutId);
        };
    });
</script>

<div
    class="column-container relative"
    data-is-dnd-in-progress={column.dndInProgress}
    data-dnd-settled={isDndSettled}
    bind:this={containerRef}
>
    <div
        class="
            content
            flex
            items-center
            px-1
            -mx-1
            my-0.5
            focus-within:bg-material-elevated-hover
            rounded-sm
            group
        "
    >
        <ColumnIcon total={board.columns.length - 1} active={index} />
        <input
            type="text"
            class="input py-2 ml-1.5"
            required
            value={column.name}
            oninput={e => agent.setColumnName(column.id, e.currentTarget.value)}
            placeholder="Column name"
        />
        <div
            class="
                ml-auto
                icon-sm
                flex
                items-center
                gap-1
                text-ink-body
                invisible
                group-focus-within:visible
                group-hover:visible
            "
        >
            <span bind:this={handleRef}>
                <GripHorizontalIcon />
            </span>
            <button onclick={() => deleteColumn(column)} class="btn--icon">
                <TrashIcon />
            </button>
        </div>
    </div>
    <div class="overlay"></div>
</div>
<hr class="border-dashed material-elevated" />

<style>
    .column-container[data-is-dnd-in-progress='true'] {
        > .overlay {
            position: absolute;
            inset: 5px;
            border-radius: 5px;
            border: 1px solid #ccc;
            background-color: #eee;
            opacity: 0;
        }

        &[data-dnd-settled='true'] > .overlay {
            transition: opacity 0.5s;
            opacity: 0.5;
        }

        > .content {
            opacity: 0;
            pointer-events: none;
        }
    }
</style>
