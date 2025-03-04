<script lang="ts">
	import {Crdt, type MessageDto} from 'syncwave-data';
	import Avatar from './avatar.svelte';
	import {timeSince} from '$lib/utils';
	import RichtextView from './richtext-view.svelte';

	interface Props {
		message: MessageDto;
	}

	let {message}: Props = $props();

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
			<Avatar user={{fullName: 'A'}} />
		</div>
		<div class="flex items-baseline gap-1.5">
			<div class="text-3xs font-semibold">{message.author.fullName}</div>
			<div class="text-4xs text-ink-detail">{when}</div>
		</div>
	</div>
	<div class="ml-[calc(1.325em+0.5rem)] text-xs leading-relaxed">
		<RichtextView {fragment} />
	</div>
</div>
