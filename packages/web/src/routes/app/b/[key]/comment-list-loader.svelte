<script lang="ts">
	import type {TaskId} from 'syncwave-data';
	import CommentList from './comment-list.svelte';
	import {observeAsync, observe} from '$lib/utils.svelte';
	import Loading from '$lib/loading.svelte';

	let {taskId}: {taskId: TaskId} = $props();

	const commentsPromise = observeAsync(rpc => rpc.getTaskComments({taskId}));
</script>

{#await commentsPromise}
	<Loading />
{:then comments}
	<CommentList comments={comments.value} {taskId} />
{:catch error}
	<p style="color: red">{error.message}</p>
{/await}
