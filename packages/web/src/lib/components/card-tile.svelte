<script lang="ts">
	import {Crdt, type BoardViewCardDto} from 'syncwave-data';
	import Avatar from './avatar.svelte';
	import {getCardRoute} from '$lib/routes';
	import {yFragmentToPlaintext} from '$lib/richtext';

	let {card}: {card: BoardViewCardDto} = $props();
	let preview = $derived.by(() => {
		const crdt = Crdt.load(card.state);
		const fragment = crdt.extractXmlFragment(x => x.text);
		const result = yFragmentToPlaintext(fragment).split('\n')[0]?.trim();

		return result || 'Untitled';
	});
</script>

<a
	href={getCardRoute(card.board.key, card.counter)}
	class="bg-subtle-0 dark:bg-subtle-1 border-divider hover:border-divider-object hover:bg-subtle-2 flex cursor-pointer items-end gap-1 rounded-lg border p-2"
>
	<div class="flex w-full flex-col gap-1 truncate">
		<span class="text-ink truncate">{preview}</span>
		<div class="flex items-center justify-between gap-0.5">
			<span class="text-2xs text-ink-detail"
				>{card.board.key}-{card.counter}</span
			>
		</div>
	</div>
	<div>
		<Avatar user={card.author} />
	</div>
</a>
