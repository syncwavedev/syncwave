<script lang="ts">
	import Avatar from '$lib/components/avatar.svelte';
	import Editor from '$lib/components/editor.svelte';
	import CircleDashedIcon from '$lib/components/icons/circle-dashed-icon.svelte';
	import EllipsisIcon from '$lib/components/icons/ellipsis-icon.svelte';
	import TimesIcon from '$lib/components/icons/times-icon.svelte';
	import MessageForm from '$lib/components/message-form.svelte';
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import SystemMessage from '$lib/components/system-message.svelte';
	import UserMessage from '$lib/components/user-message.svelte';
	import {getBoardRoute} from '$lib/routes';
	import {getSdk} from '$lib/utils';
	import {observe} from '$lib/utils.svelte';
	import {onDestroy} from 'svelte';
	import {Crdt, log, type CardViewDto} from 'syncwave-data';

	interface Props {
		boardKey: string;
		counter: number;
		initialCard: CardViewDto;
	}

	let {boardKey, counter, initialCard}: Props = $props();

	const card = observe(initialCard, x =>
		x.getCardView({cardId: initialCard.id})
	);
	const crdt = Crdt.load(card.value.state);
	$effect(() => crdt.apply(card.value.state));

	const fragment = crdt.extractXmlFragment(x => x.text);

	const sdk = getSdk();
	const unsub = crdt.subscribe('update', diff => {
		sdk(x =>
			x.applyCardDiff({
				cardId: card.value.id,
				diff,
			})
		).catch(error => {
			log.error(error, 'failed to apply card diff');
		});
	});

	onDestroy(() => unsub());
</script>

<div
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex h-full w-112 min-w-84 flex-shrink-0 flex-col border-l"
>
	<div class="flex h-full flex-col">
		<div class="min-h-0 flex-1">
			<ScrollArea
				orientation="vertical"
				type="always"
				class="hello h-full"
			>
				<div class="px-4">
					<div
						class="bg-subtle-0 dark:bg-subtle-1 sticky top-0 z-20 my-2 flex items-center"
					>
						<div class="text-xs font-semibold">
							{boardKey}-{counter}
						</div>
						<button class="btn--icon ml-auto">
							<EllipsisIcon />
						</button>
						<a href={getBoardRoute(boardKey)} class="btn--icon">
							<TimesIcon />
						</a>
					</div>
					<Editor placeholder="Write here..." {fragment} />
					<div class="flex gap-1">
						<div class="btn--block">
							<CircleDashedIcon />
							<span class="ml-1.5 text-xs capitalize"
								>{card.value.column?.title}</span
							>
						</div>
						<div class="btn--block">
							<span> <Avatar user={card.value.author} /></span>
							<span class="ml-1.5 text-xs"
								>{card.value.author.fullName}</span
							>
						</div>
					</div>
				</div>
				<hr class="-mx-4 mt-2 mb-4" />
				<div class="px-4">
					<SystemMessage
						author={card.value.author.fullName}
						message={`created on ${new Date(card.value.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`}
					/>
					{#each card.value.messages as message (message.id)}
						<UserMessage {message} />
					{/each}
				</div>
			</ScrollArea>
		</div>
		<MessageForm cardId={card.value.id} />
	</div>
</div>
