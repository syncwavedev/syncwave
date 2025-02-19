<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {BoardDto, MemberDto} from 'syncwave-data';
	import {dndzone, type DndEvent} from 'svelte-dnd-action';
	import NavBoardCard from './nav-board-card.svelte';
	import {cn} from '$lib/utils';

	const flipDurationMs = 100;
	export let handleDndConsiderMembers: (
		e: CustomEvent<DndEvent<MemberDto>>
	) => void;
	export let handleDndFinalizeMembers: (
		e: CustomEvent<DndEvent<MemberDto>>
	) => void;
	export let members: MemberDto[];
</script>

<ul
	use:dndzone={{
		items: members,
		flipDurationMs,
		type: 'members',
		dropTargetStyle: {},
	}}
	on:consider={handleDndConsiderMembers}
	on:finalize={handleDndFinalizeMembers}
	data-sidebar="menu"
	class="flex w-full min-w-0 flex-col gap-1 pb-20"
>
	{#each members as member (member.id)}
		<NavBoardCard board={member.board} />
	{/each}
</ul>
