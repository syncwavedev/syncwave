<script lang="ts">
	import {
		assert,
		log,
		stringifyCrdtDiff,
		toPosition,
		type BoardViewColumnDto,
		type BoardViewDto,
		type BoardViewTaskDto,
	} from 'syncwave-data';
	import {
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent,
	} from 'svelte-dnd-action';
	import BoardInner from './board-inner.svelte';
	import {BoardViewCrdt} from '$lib/crdt/board-view-crdt';
	import {
		compareBigFloat,
		type BigFloat,
	} from '../../../../../../data/dist/esm/src/big-float';
	import {getSdk} from '$lib/utils';
	import {findMoved} from '$lib/move';
	import {untrack} from 'svelte';

	let {board: remoteBoard}: {board: BoardViewDto} = $props();

	const localBoard = new BoardViewCrdt(remoteBoard);
	$effect(() => {
		localBoard.apply(remoteBoard);
		const latestColumns = applyOrder(localBoard.snapshot().columns);
		untrack(() => {
			const shadowColumn = columns.find(
				item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
			);

			const shadowTask = columns
				.flatMap(x => x.tasks)
				.find(item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);

			const mapColumn = (column: BoardViewColumnDto) => {
				return {
					...column,
					tasks: column.tasks.map(task =>
						task.pk[0] === shadowTask?.pk[0]
							? {
									...shadowTask,
									...task,
								}
							: task
					),
				};
			};

			columns = latestColumns.map(column =>
				column.id === shadowColumn?.id
					? {
							...shadowColumn,
							...mapColumn(column),
						}
					: mapColumn(column)
			);
		});
	});

	function applyOrder(columns: BoardViewColumnDto[]) {
		const result = [...columns].sort((a, b) =>
			compareBigFloat(a.boardPosition, b.boardPosition)
		);

		for (const column of result) {
			column.tasks = [...column.tasks].sort((a, b) =>
				compareBigFloat(a.columnPosition, b.columnPosition)
			);
		}

		return result;
	}

	let columns = $state(
		applyOrder($state.snapshot(remoteBoard.columns) as BoardViewColumnDto[])
	);

	function toIds<T extends {pk: [unknown]}>(items: T[]): T['pk'][0][] {
		return items.map(item => item.pk[0]);
	}

	const sdk = getSdk();

	function calculateChange<T extends {pk: [unknown]; id: unknown}>(
		localItems: T[],
		dndItems: T[],
		newDndItems: T[],
		getPosition: (item: T | undefined) => BigFloat | undefined
	): {target: T['pk'][0]; newPosition: BigFloat} | undefined {
		const moved = findMoved(toIds(dndItems), toIds(newDndItems));

		if (!moved) {
			return undefined;
		}

		const {target, prev, next} = moved;
		const prevAnchor = localItems.find(x => x.id === prev);
		const nextAnchor = localItems.find(x => x.id === next);

		const newTargetPosition = toPosition({
			next: getPosition(nextAnchor),
			prev: getPosition(prevAnchor),
		});

		return {target, newPosition: newTargetPosition};
	}

	function setColumns(e: CustomEvent<DndEvent<BoardViewColumnDto>>) {
		const newColumns = e.detail.items;

		const update = calculateChange(
			localBoard.snapshot().columns,
			e.detail.items,
			newColumns,
			column => column?.boardPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = localBoard.setColumnPosition(target, newPosition);

			if (diff) {
				sdk(x =>
					x.applyColumnDiff({
						columnId: target,
						diff: stringifyCrdtDiff(diff),
					})
				).catch(error => {
					log.error(error, 'failed to send column diff');
				});
			}
		}

		columns = newColumns;
	}

	function setTasks(
		column: BoardViewColumnDto,
		e: CustomEvent<DndEvent<BoardViewTaskDto>>
	) {
		const dndColumn = columns.find(x => x.id === column.id);
		assert(dndColumn !== undefined, 'dnd column not found');
		const localColumn = localBoard
			.snapshot()
			.columns.find(x => x.id === column.id);
		assert(localColumn !== undefined, 'local column not found');
		const update = calculateChange(
			localColumn.tasks,
			dndColumn.tasks,
			e.detail.items,
			task => task?.columnPosition
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = localBoard.setTaskPosition(
				target,
				newPosition,
				column.id
			);

			if (diff) {
				sdk(x =>
					x.applyTaskDiff({
						taskId: target,
						diff: stringifyCrdtDiff(diff),
					})
				).catch(error => {
					log.error(error, 'failed to send task diff');
				});
			}
		}

		column.tasks = e.detail.items;
	}
</script>

<BoardInner
	{columns}
	flipDurationMs={100}
	handleDndConsiderCards={setTasks}
	handleDndFinalizeCards={setTasks}
	handleDndConsiderColumns={setColumns}
	handleDndFinalizeColumns={setColumns}
/>
