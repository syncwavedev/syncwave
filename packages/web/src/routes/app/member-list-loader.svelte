<script lang="ts">
	import type {BoardId} from 'syncwave-data';
	import MemberList from './member-list.svelte';
	import {observeAsync, observe} from '$lib/utils.svelte';
	import Loading from '$lib/loading.svelte';

	let {boardId}: {boardId: BoardId} = $props();

	const membersPromise = observeAsync(rpc => rpc.getBoardMembers({boardId}));
</script>

{#await membersPromise}
	<Loading />
{:then members}
	<MemberList members={members.value} {boardId} />
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
