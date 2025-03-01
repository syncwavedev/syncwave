<script lang="ts">
	import TimesIcon from './icons/times-icon.svelte';
	import ArrowRightIcon from './icons/arrow-right-icon.svelte';
	import KanbanIcon from './icons/kanban-icon.svelte';
	import KeyIcon from './icons/key-icon.svelte';

	interface Props {
		name: string;
		key: string;
		onClose: () => void;
		onNext: () => void;
	}

	let {
		onClose,
		onNext,
		name = $bindable(),
		key = $bindable(),
	}: Props = $props();

	function submit(e: Event) {
		e.preventDefault();
		onNext();
	}
</script>

<div class="mx-4 my-2 flex items-center">
	<button onclick={onClose} class="btn--icon ml-auto">
		<TimesIcon />
	</button>
</div>
<hr />
<form onsubmit={submit}>
	<div class="mx-4 flex items-center gap-2">
		<span class="text-ink-detail"><KanbanIcon /></span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			autocomplete="off"
			type="text"
			bind:value={name}
			required
			id="name"
			class="input my-4 text-xs"
			placeholder="Board Name"
			autofocus
		/>
	</div>
	<hr />
	<div class="mx-4 flex items-center gap-2">
		<span class="text-ink-detail"><KeyIcon /></span>
		<input
			autocomplete="off"
			bind:value={key}
			required
			minlength="3"
			type="text"
			id="key"
			class="input my-4 text-xs"
			placeholder="Board Key"
		/>
	</div>
	<hr />
	<button type="submit" class="btn--block mx-4 my-2 ml-auto">
		<span class="mr-1.5 text-xs">Add members</span>
		<ArrowRightIcon />
	</button>
</form>
