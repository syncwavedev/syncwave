<script lang="ts">
	import type {TaskId} from 'syncwave-data';
	import CommentList from './comment-list.svelte';
	import {fetchState, getState} from '$lib/utils.svelte';
	import Loading from '$lib/loading.svelte';

	let {taskId}: {taskId: TaskId} = $props();

	const commentsPromise = fetchState(rpc => rpc.getTaskComments({taskId}));
</script>

{#await commentsPromise}
	<Loading />
{:then comments}
	<CommentList comments={comments.value} {taskId} />
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
