<script lang="ts">
	import type {BoardViewColumnDto} from 'syncwave-data';
	import TrashIcon from '../icons/trash-icon.svelte';

	interface Props {
		column: BoardViewColumnDto;
	}

	let {column: remoteColumn}: Props = $props();

	let name = $state(remoteColumn.title);
</script>

<input
	type="text"
	class="input text-xs"
	required
	value={name}
	placeholder="Column name"
/>
<button class="btn--icon ml-auto">
	<TrashIcon />
</button>
