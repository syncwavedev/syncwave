<script lang="ts">
	import Avatar from '../Avatar.svelte';
	import ContextMenu from '../mobile/ContextMenu.svelte';
	import navigator from '../../lib/navigator.js';
	import type {Task} from '../../lib/models.js';
	import ColumnIcon from './ColumnIcon.svelte';
	import ChevronDown from '../icons/ChevronDown.svelte';
	import {slide} from 'svelte/transition';

	const tasks: Task[] = Array(3)
		.fill(null)
		.flatMap(() => [
			{
				id: 1,
				content: 'Update README',
				column: 'To Do',
				user: 'John'
			},
			{
				id: 1,
				content: 'Design board',
				column: 'To Do',
				user: 'John'
			},
			{
				id: 1,
				content: 'Deploy to production',
				column: 'To Do',
				user: 'John'
			},
			{
				id: 1,
				content: 'Release on hacker news',
				column: 'To Do',
				user: 'Andrei'
			},
			{
				id: 1,
				content: 'Write tests',
				column: 'To Do',
				user: 'Andrei'
			},
			{
				id: 2,
				content: 'Complete task',
				column: 'In Progress',
				user: 'Mike'
			},
			{
				id: 3,
				content: 'Review task',
				column: 'Done',
				user: 'John'
			}
		]);

	function onTaskClick(taskId: number) {
		// navigator.navigate(`/tasks/${taskId}`, {
		// 	updateBrowserURL: true,
		// 	updateState: true
		// });
	}

	interface Column {
		name: string;
		tasks: Task[];
		isCollapsed?: boolean;
	}

	const columns = $state(
		Object.values(
			tasks.reduce<Record<string, Column>>((acc, task) => {
				if (!acc[task.column]) {
					acc[task.column] = {
						name: task.column,
						tasks: [],
						isCollapsed: false
					};
				}

				acc[task.column].tasks.push(task);

				return acc;
			}, {})
		)
	);

	function toggleColumn(column: Column) {
		column.isCollapsed = !column.isCollapsed;
	}
</script>

<div class="columns">
	{#each columns as column, i}
		<div class="column">
			<div
				role="button"
				tabindex="0"
				class="column__title flex align-center justify-between"
				onclick={() => toggleColumn(column)}
				onkeydown={e => e.key === 'Enter' && toggleColumn(column)}
			>
				<h2 class="font-semibold">{column.name}</h2>
				<button
					class="btn btn--icon icon--sm text-secondary"
					style="transform: rotate({column.isCollapsed ? -90 : 0}deg); transition: transform 0.2s;"
				>
					<ChevronDown />
				</button>
			</div>
			{#if !column.isCollapsed}
				<ul class="column__tasks" transition:slide={{duration: 200}}>
					{#each column.tasks as task}
						<ContextMenu
							title={task.content}
							options={[
								{
									label: 'Edit',
									action: () => {}
								},
								{
									label: 'Move',
									action: () => {}
								},
								{
									label: 'Delete',
									action: () => {}
								}
							]}
						>
							<li>
								<div
									class="column__tasks__item flex align-center gap-1"
									role="button"
									tabindex="0"
									onclick={() => onTaskClick(task.id)}
									onkeydown={e => e.key === 'Enter' && onTaskClick(task.id)}
								>
									<button class="btn btn--icon">
										<ColumnIcon percentage={5} />
									</button>
									{task.content}
									<button class="ml-auto btn btn--icon">
										<Avatar title={task.user} />
									</button>
								</div>
							</li>
						</ContextMenu>
					{/each}
				</ul>
			{/if}
		</div>
		{#if i < columns.length - 1}
			<hr />
		{/if}
	{/each}
</div>

<style>
	.columns,
	.column__tasks {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.column__title {
		padding-left: calc(env(safe-area-inset-left) + 0.95rem);
		padding-right: calc(env(safe-area-inset-right) + 0.325rem);
	}

	.column__tasks__item {
		padding-left: calc(env(safe-area-inset-left) + 0.325rem);
		padding-right: calc(env(safe-area-inset-right) + 0.325rem);
	}
</style>
