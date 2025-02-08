<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import {getSdk} from '$lib/utils';
	import {Trash} from 'lucide-svelte';
	import type {CommentDto} from 'syncwave-data';

	let {comment}: {comment: CommentDto} = $props();

	const sdk = getSdk();

	async function deleteComment() {
		await sdk(rpc => rpc.deleteComment({commentId: comment.id}));
	}
</script>

<div>
	Author: {comment.author.id}
	Comment: {comment.text}
	<Button onclick={deleteComment} variant="ghost" size="icon">
		<Trash />
	</Button>
</div>
