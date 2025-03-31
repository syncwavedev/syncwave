<script lang="ts">
	import {
		Crdt,
		type AttachmentDto,
		type CrdtDoc,
		type Message,
		type MessageDto,
		type User,
	} from 'syncwave';
	import Avatar from './avatar.svelte';
	import AttachmentView from './attachment-view.svelte';
	import RichtextView from './richtext-view.svelte';
	import {timeSince} from '../utils';

	interface Props {
		message: CrdtDoc<Message>;
		attachments: AttachmentDto[];
		author: User;
	}

	let {message, author, attachments}: Props = $props();

	let fragment = $derived(
		Crdt.load(message.state).extractXmlFragment(x => x.text)
	);

	let when = $state(timeSince(message.createdAt));
	$effect(() => {
		const interval = setInterval(() => {
			when = timeSince(message.createdAt);
		}, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="mb-4 flex flex-col">
	<div class="flex items-center gap-1.5">
		<div class="text-[1.325em]">
			<Avatar user={author} />
		</div>
		<div class="flex items-baseline gap-1.5">
			<div class="text-3xs font-semibold">{author.fullName}</div>
			<div class="text-4xs text-ink-detail">{when}</div>
		</div>
	</div>
	{#each attachments as attachment}
		<AttachmentView {attachment} />
	{/each}
	<div class="ml-[calc(1.325em+0.5rem)] text-xs leading-relaxed">
		<RichtextView {fragment} />
	</div>
</div>
