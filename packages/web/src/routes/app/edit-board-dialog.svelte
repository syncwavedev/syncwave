<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import {ScrollArea} from '$lib/components/ui/scroll-area';
	import type {BoardDto} from 'syncwave-data';
	import EditBoard from './edit-board.svelte';

	let {board, open = $bindable()}: {board: BoardDto; open: boolean} =
		$props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[1000px]">
		<Dialog.Header>
			<Dialog.Description>Edit board: {board.name}</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="max-h-[80vh]">
			<EditBoard {board} />
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
