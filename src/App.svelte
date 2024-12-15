<script lang="ts">
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';

	import {
		vibrate,
		impactFeedback,
		notificationFeedback,
		selectionFeedback
	} from '@tauri-apps/plugin-haptics';

	let isOpen = false;

	let tasks = [
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Buy groceries', done: false },
		{ text: 'Finish project report', done: false },
		{ text: 'Call the dentist', done: false },
		{ text: 'Schedule meeting with team', done: false },
		{ text: 'Pay electricity bill', done: false },
		{ text: 'Read a book', done: false },
		{ text: 'Water the plants', done: false },
		{ text: 'Send birthday gift', done: false },
		{ text: 'Plan weekend getaway', done: false },
		{ text: 'Clean the garage', done: false }
	];

	let editingIndex: number = null;
	let editingValue = '';

	function triggerHaptic() {
		impactFeedback('medium');
	}

	async function toggle() {
		isOpen = !isOpen;
		triggerHaptic();
	}

	function toggleTask(task) {
		task.done = !task.done;
		tasks = [...tasks]; // force update
		triggerHaptic();
	}

	// Start editing a task
	function startEditing(i) {
		editingIndex = i;
		editingValue = tasks[i].text;
	}

	// Commit editing changes
	function commitEdit(i) {
		tasks[i].text = editingValue.trim() || tasks[i].text;
		tasks = [...tasks]; // force update
		editingIndex = null;
		editingValue = '';
	}

	function handleKeyDown(e, i) {
		if (e.key === 'Enter') {
			e.target.blur();
		}
	}

	onMount(() => {
		// Ensure taskElements is always up-to-date if tasks change length
		// This happens automatically because bind:this updates as tasks update.
	});
</script>

<main class="app-container">
	<header class="app-header">
		<h1>Reminders</h1>
	</header>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	{#each Array(100).fill(null) as _, i}
		<section class="collapsible-section">
			<button on:click={toggle} class="collapsible-title">
				{isOpen ? 'Hide Tasks' : 'Show Tasks'}
			</button>

			{#if isOpen}
				<div class="collapsible-content" transition:slide={{ duration: 300 }}>
					<ul class="task-list">
						{#each tasks as task, i}
							<li class="task-item">
								<div
									class="checkbox-wrapper"
									on:click={(e) => {
										e.stopPropagation();
										toggleTask(task);
									}}
								>
									<div class="checkbox {task.done ? 'checked' : ''}">
										<span class="checkmark">{task.done ? '✓' : ''}</span>
									</div>
								</div>
								<div
									class="task-text {task.done ? 'done' : ''}"
									on:dblclick={() => startEditing(i)}
									contenteditable
								>
									{task.text}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</section>
	{/each}
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
	<section class="collapsible-section">
		<button on:click={toggle} class="collapsible-title">
			{isOpen ? 'Hide Tasks' : 'Show Tasks'}
		</button>

		{#if isOpen}
			<div class="collapsible-content" transition:slide={{ duration: 300 }}>
				<ul class="task-list">
					{#each tasks as task, i}
						<li class="task-item">
							<div
								class="checkbox-wrapper"
								on:click={(e) => {
									e.stopPropagation();
									toggleTask(task);
								}}
							>
								<div class="checkbox {task.done ? 'checked' : ''}">
									<span class="checkmark">{task.done ? '✓' : ''}</span>
								</div>
							</div>
							<div
								class="task-text {task.done ? 'done' : ''}"
								on:dblclick={() => startEditing(i)}
								contenteditable
							>
								{task.text}
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>
</main>

<style>
	:root {
		--bg-color: #fff;
		--text-color: #000;
		--task-done-color: #8e8e93;
		--checkmark-border: #c7c7cc;
		--checkmark-bg: #007aff;

		font-family: -apple-system, BlinkMacSystemFont, 'San Francisco', 'Helvetica Neue', Helvetica,
			Arial, sans-serif;
		font-size: 17px;
		line-height: 1.4;
		-webkit-font-smoothing: antialiased;
	}

	@media (prefers-color-scheme: dark) {
		:root {
			--bg-color: #000;
			--text-color: #fff;
			--task-done-color: #8e8e93;
			--checkmark-border: #505050;
			--checkmark-bg: #0a84ff;
		}
	}

	.app-container {
		background: var(--bg-color);
		color: var(--text-color);
		min-height: 100vh;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		transition:
			background 0.3s,
			color 0.3s;
	}

	.app-header {
		padding: 60px 20px 20px;
	}

	.app-header h1 {
		font-size: 34px;
		font-weight: 700;
		margin: 0;
	}

	.collapsible-section {
		margin: 0 20px;
	}

	.collapsible-title {
		cursor: pointer;
		background: none;
		border: none;
		font-size: 20px;
		padding: 10px 0;
		text-align: left;
		width: 100%;
		color: var(--text-color);
		font-weight: 500;
		border-bottom: 1px solid #ddd;
	}

	@media (prefers-color-scheme: dark) {
		.collapsible-title {
			border-bottom: 1px solid #333;
		}
	}

	.collapsible-content {
		overflow: hidden;
	}

	.task-list {
		list-style-type: none;
		margin: 0;
		padding: 0;
		background: var(--bg-color);
		transition: background 0.3s;
	}

	.task-item {
		display: flex;
		align-items: center;
		padding: 14px 0;
		border-bottom: 1px solid #ddd;
		transition: color 0.3s;
		touch-action: pan-y; /* allow vertical scrolling if not dragging */
	}

	.task-item:last-child {
		border-bottom: none;
	}

	@media (prefers-color-scheme: dark) {
		.task-item {
			border-bottom: 1px solid #333;
		}
	}

	.checkbox-wrapper {
		margin-right: 14px;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		user-select: none;
	}

	.checkbox {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid var(--checkmark-border);
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		transition:
			border-color 0.3s,
			background-color 0.3s;
		position: relative;
	}

	.checkbox.checked {
		background-color: var(--checkmark-bg);
		border-color: var(--checkmark-bg);
	}

	.checkmark {
		color: #fff;
		font-size: 16px;
		line-height: 1;
		pointer-events: none;
	}

	.task-text {
		font-size: 17px;
		word-break: break-word;
		flex: 1;
		cursor: default;
		user-select: text;
	}

	.task-text.done {
		color: var(--task-done-color);
	}

	.task-edit-input {
		font-size: 17px;
		flex: 1;
		border: none;
		border-bottom: 1px solid #007aff;
		background: transparent;
		color: var(--text-color);
		outline: none;
		padding: 2px 0;
	}

	.task-edit-input:focus {
		border-bottom: 2px solid #007aff;
	}

	@media (prefers-color-scheme: dark) {
		.task-edit-input {
			border-bottom: 1px solid #0a84ff;
		}
		.task-edit-input:focus {
			border-bottom: 2px solid #0a84ff;
		}
	}
</style>
