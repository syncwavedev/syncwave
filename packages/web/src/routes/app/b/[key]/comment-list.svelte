<script lang="ts">
	import {createCommentId, type CommentDto, type TaskId} from 'syncwave-data';
	import Comment from './comment.svelte';
	import {getSdk} from '$lib/utils';
	import {Textarea} from '$lib/components/ui/textarea/index.js';
	import Button from '$lib/components/ui/button/button.svelte';

	let {comments, taskId}: {comments: CommentDto[]; taskId: TaskId} = $props();

	let text = $state('');

	const sdk = getSdk();

	async function createComment(e: SubmitEvent) {
		e.preventDefault();
		console.log('hello');
		text = text.trim();
		if (text.length === 0) return;
		await sdk(rpc =>
			rpc.createComment({taskId, text, commentId: createCommentId()})
		);
		text = '';
	}
</script>

{#each comments as comment}
	<Comment {comment} />
{/each}

<form onsubmit={createComment}>
	<Textarea bind:value={text} />
	<Button type="submit">Add comment</Button>
</form>
