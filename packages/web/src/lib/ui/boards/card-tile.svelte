<script lang="ts">
	import {Crdt, type BoardViewCardDto} from 'syncwave-data';
	import {yFragmentToPlaintext} from '$lib/richtext';
	import Avatar from '../components/avatar.svelte';

	const {card}: {card: BoardViewCardDto} = $props();

	let preview = $derived.by(() => {
		const crdt = Crdt.load(card.state);
		const fragment = crdt.extractXmlFragment(x => x.text);
		const result = yFragmentToPlaintext(fragment).split('\n')[0]?.trim();

		return result || 'Untitled';
	});
</script>

<div
	class="bg-subtle-0 dark:bg-subtle-1 hover:border-divider-object hover:bg-subtle-2 group border-divider flex cursor-pointer items-end gap-1 rounded-md border p-2"
>
	<div class="flex w-full flex-col gap-1 truncate">
		<span class="text-2xs text-ink-detail">{card.board.key}-{card.counter}</span
		>
		<span class="text-ink truncate">
			{preview}
		</span>
		<span class="text-2xs text-ink-detail">By Andrei on Thu</span>
	</div>
	<div class="">
		<span class="text-[1.325rem]">
			<Avatar name={card.author.fullName} />
		</span>
		<!-- <button class="btn--icon btn-sm">{{template "user.html" }}</button> -->
	</div>
</div>
