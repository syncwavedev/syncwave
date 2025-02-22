<script lang="ts">
	import type {BoardViewCardDto, CardDto} from 'syncwave-data';
	import Avatar from './avatar.svelte';

	let {card}: {card: BoardViewCardDto} = $props();
</script>

<div class="subtle-2 hover-subtle-3 flex flex-col gap-1 rounded-lg p-2">
	<span class="text-ink truncate">{card.title}</span>
	<div class="flex items-center justify-between gap-0.5">
		<span class="text-2xs text-ink-detail"
			>{card.board.key}-{card.counter}</span
		>
		<span class="text-[1.25rem]">
			<Avatar user={card.author} />
		</span>
	</div>
</div>
