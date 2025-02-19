<script lang="ts">
	import {flip} from 'svelte/animate';
	import {dndzone, type DndEvent} from 'svelte-dnd-action';
	import type {BoardViewColumnDto, BoardViewTaskDto} from 'syncwave-data';

	const flipDurationMs = 100;
	export let handleDndConsiderColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndFinalizeColumns: (
		e: CustomEvent<DndEvent<BoardViewColumnDto>>
	) => void;
	export let handleDndConsiderCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;
	export let handleDndFinalizeCards: (
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) => void;

	export let columns: BoardViewColumnDto[];
</script>

<section
	use:dndzone={{
		items: columns,
		flipDurationMs,
		type: 'columns',
		dropTargetStyle: {},
	}}
	on:consider={handleDndConsiderColumns}
	on:finalize={handleDndFinalizeColumns}
	class="flex gap-4"
>
	{#each columns as column (column.id)}
		<div
			class="flex w-[220px] flex-col bg-white text-xs"
			animate:flip={{duration: flipDurationMs}}
		>
			<div
				class="text-ink-body sticky top-0 mb-2 mt-2 bg-white px-2 text-sm"
			>
				{column.title}
			</div>
			<div
				class="flex h-full flex-col pb-20"
				use:dndzone={{
					items: column.tasks,
					flipDurationMs,
					type: 'cards',
					dropTargetStyle: {},
				}}
				on:consider={e => handleDndConsiderCards(column, e)}
				on:finalize={e => handleDndFinalizeCards(column, e)}
			>
				{#each column.tasks as task (task.id)}
					<div
						animate:flip={{duration: flipDurationMs}}
						class="group pb-2"
					>
						<div
							class="bg-subtle-3 hover:bg-subtle-3 flex w-full flex-col gap-1 rounded-lg bg-gray-100 p-1.5 group-hover:bg-gray-200"
						>
							<span class="text-ink truncate">{task.title}</span>
							<div
								class="flex items-center justify-between gap-0.5"
							>
								<span class="text-3xs text-ink-detail">
									{task.board.key}-{task.counter}
								</span>
								<span class="text-[1.25rem]">
									<div
										class="border-border bg-bg grid h-[1em] w-[1em] place-items-center rounded-full border"
									>
										<div
											class="text-[0.45em] font-semibold"
										>
											D
										</div>
									</div>
								</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</section>
