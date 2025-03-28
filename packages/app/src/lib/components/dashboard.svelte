<script lang="ts">
	import type {Identity, MemberDto, UserDto} from 'syncwave';
	import {observe} from '$lib/utils.svelte';
	import BoardItem from './board-item.svelte';

	let {
		initialMyMembers,
	}: {
		initialMyMembers: MemberDto[];
	} = $props();

	const myMembers = observe(initialMyMembers, x => x.getMyMembers({}));
</script>

<div class="mt-2 flex flex-col items-start overflow-y-auto text-sm">
	{#each myMembers.value as myMember (myMember.id)}
		<BoardItem board={myMember.board} />
	{/each}
</div>
