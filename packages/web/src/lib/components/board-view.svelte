<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dndzone, type DndEvent} from 'svelte-dnd-action';
	import type {BoardViewColumnDto, BoardViewTaskDto} from 'syncwave-data';
	import TaskTile from './task-tile.svelte';

	const flipDurationMs = 100;
	export let handleDndConsiderColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndFinalizeColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndConsiderTasks: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;
	export let handleDndFinalizeTasks: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;

	export let columns: BoardViewColumnDto[];
</script>

<div class="mt-2 flex-1 overflow-y-auto">
	<div
		class="flex gap-6 text-sm"
		use:dndzone={{
			items: columns,
			flipDurationMs,
			type: 'columns',
			dropTargetStyle: {},
		}}
		on:consider={handleDndConsiderColumns}
		on:finalize={handleDndFinalizeColumns}
	>
		{#each columns as column (column.id)}
			<div
				class="flex w-64 flex-col"
				animate:flip={{duration: flipDurationMs}}
			>
				<div class="text-ink-body text-2xs mb-2">{column.title}</div>
				<div
					class="flex flex-1 flex-col gap-2 pb-40"
					use:dndzone={{
						items: column.tasks,
						flipDurationMs,
						type: 'tasks',
						dropTargetStyle: {},
					}}
					on:consider={e => handleDndConsiderTasks(column, e)}
					on:finalize={e => handleDndFinalizeTasks(column, e)}
				>
					{#each column.tasks as task (task.id)}
						<div animate:flip={{duration: flipDurationMs}}>
							<TaskTile {task} />
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
