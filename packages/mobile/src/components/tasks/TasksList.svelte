<script lang="ts">
	import Avatar from '../Avatar.svelte';
	import ContextMenu from '../mobile/ContextMenu.svelte';
	import ColumnIcon from './ColumnIcon.svelte';
	import {slide} from 'svelte/transition';
	import {tasks, columns} from '../../lib/mock.js';
</script>

<div class="columns">
	{#each columns as column, i}
		<div>
			<div class="mt-4 mb-1 ml-4">
				<h3 class="font-semibold">{column}</h3>
			</div>
			<ul class="column__tasks" transition:slide={{duration: 150}}>
				{#each tasks.filter(x => x.column == column) as task}
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
								class="column__tasks__item flex align-center leading-none"
								role="button"
								tabindex="0"
							>
								<button class="btn btn--icon">
									<ColumnIcon percentage={(i * 100) / (columns.length - 1)} />
								</button>
								<span class="flex-shrink-0 column__tasks__item__number text-secondary"
									>{task.id}</span
								>
								<span class="text-truncate">{task.content}</span>
								<button class="ml-auto btn btn--icon">
									<Avatar title={task.user} />
								</button>
							</div>
						</li>
					</ContextMenu>
				{/each}
			</ul>
		</div>
		{#if i < columns.length - 1}
			<!-- <hr /> -->
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

	.column__tasks__item {
		padding-left: calc(env(safe-area-inset-left) + 0.275rem);
		padding-right: calc(env(safe-area-inset-right) + 0.275rem);
	}

	.column__tasks__item__number {
		margin-right: 0.625rem;
	}
</style>
