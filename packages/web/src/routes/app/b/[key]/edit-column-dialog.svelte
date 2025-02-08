<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import {ScrollArea} from '$lib/components/ui/scroll-area';
	import type {ColumnDto, Column} from 'syncwave-data';
	import EditColumn from './edit-column.svelte';

	let {column, open = $bindable()}: {column: ColumnDto; open: boolean} =
		$props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[1000px]">
		<Dialog.Header>
			<Dialog.Description>Edit column: {column.title}</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="max-h-[80vh]">
			<EditColumn {column} />
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
