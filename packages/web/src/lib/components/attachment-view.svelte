<script lang="ts">
	import Loading from '$lib/components/loading.svelte';
	import {getRpc} from '$lib/utils';
	import {log, toError, type AttachmentDto} from 'syncwave-data';

	interface Props {
		attachment: AttachmentDto;
	}

	let {attachment}: Props = $props();

	let imageUrl: string | undefined = $state(undefined);
	let isImage = attachment.metadata.contentType.startsWith('image/');

	const rpc = getRpc();
	$effect(() => {
		if (isImage) {
			rpc(x => x.getAttachmentObject({attachmentId: attachment.id}))
				.then(({data, metadata}) => {
					imageUrl = URL.createObjectURL(
						new Blob([data], {type: metadata.contentType})
					);
				})
				.catch(error => {
					log.error(toError(error), 'Error fetching attachment:');
				});
		}
	});
</script>

{#if isImage}
	{#if imageUrl}
		<img src={imageUrl} alt="Message attachment" />
	{:else}
		<Loading />
	{/if}
{/if}
