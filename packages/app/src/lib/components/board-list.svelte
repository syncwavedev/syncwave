<script lang="ts">
	import type {MemberDto} from 'syncwave-data';
	import {dndzone, type DndEvent} from 'svelte-dnd-action';
	import BoardItem from './board-item.svelte';

	const flipDurationMs = 100;
	export let handleDndConsiderMembers: (
		e: CustomEvent<DndEvent<MemberDto>>
	) => void;
	export let handleDndFinalizeMembers: (
		e: CustomEvent<DndEvent<MemberDto>>
	) => void;
	export let myMembers: MemberDto[];
</script>

<ul
	use:dndzone={{
		items: myMembers,
		flipDurationMs,
		type: 'members',
		dropTargetStyle: {},
	}}
	on:consider={handleDndConsiderMembers}
	on:finalize={handleDndFinalizeMembers}
	data-sidebar="menu"
	class="flex w-full min-w-0 flex-col gap-1 pb-20"
>
	{#each myMembers as myMember (myMember.id)}
		<BoardItem board={myMember.board} />
	{/each}
</ul>
