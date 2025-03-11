<script lang="ts">
	import {Crdt, log, type BoardViewCardDto} from 'syncwave-data';
	import Avatar from '../components/avatar.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import LinkIcon from '../components/icons/link-icon.svelte';
	import TrashIcon from '../components/icons/trash-icon.svelte';
	import TimesIcon from '../components/icons/times-icon.svelte';
	import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import {observe} from '$lib/utils.svelte';
	import {onDestroy} from 'svelte';
	import {getSdk} from '$lib/utils';
	import Editor from '$lib/components/editor.svelte';
	import appNavigator from '../app-navigator';

	const {
		initialCard,
	}: {
		initialCard: BoardViewCardDto;
	} = $props();

	const card = observe(initialCard, x =>
		x.getCardView({cardId: initialCard.id})
	);
	const crdt = Crdt.load(card.value.state);
	$effect(() => crdt.apply(card.value.state));

	const fragment = crdt.extractXmlFragment(x => x.text);

	const sdk = getSdk();
	const unsub = crdt.onUpdate(diff => {
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
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex w-124 min-w-84 flex-shrink-0 flex-col border-l"
>
	<!-- Scrollable Content Section -->
	<div class="flex-grow overflow-y-auto">
		<!-- Header with Context Menu -->
		<div
			class="bg-subtle-0 dark:bg-subtle-1 border-divider sticky top-0 z-20 flex items-center border-b px-4 py-1"
		>
			<div class="text-xs font-semibold">
				{card.value.board.key}–{card.value.counter}
			</div>
			<div class="relative ml-auto">
				<button class="btn--icon" id="ellipsis-button">
					<EllipsisIcon />
				</button>
				<div
					id="context-menu"
					class="bg-subtle-2 border-divider-object absolute right-0 hidden w-46 rounded-lg border p-1"
				>
					<ul>
						<li
							class="hover:bg-subtle-3 flex h-[1.8rem] cursor-pointer items-center gap-1.5 rounded-sm px-2"
						>
							<LinkIcon />
							<span class="text-xs leading-none">Copy Link</span>
						</li>
						<li
							class="hover:bg-subtle-3 text-ink-danger flex h-[1.8rem] cursor-pointer items-center gap-1.5 rounded-sm px-2"
						>
							<TrashIcon />
							<span class="text-xs leading-none">Delete </span>
						</li>
					</ul>
				</div>
			</div>
			<button class="btn--icon" onclick={appNavigator.back}>
				<TimesIcon />
			</button>
		</div>
		<div class="mx-4 mt-4">
			<!-- Task Description -->
			<div class="input mb-2 w-full text-xs leading-relaxed">
				<Editor
					class="min-h-[100px]"
					placeholder="Write here..."
					{fragment}
				/>
			</div>
			<hr class="-mx-4 mt-4 mb-4" />
			<!-- Task Actions -->
			<div class="grid grid-cols-[min-content_1fr] gap-x-6 gap-y-4">
				<div class="text-ink-detail flex items-center gap-2">
					<CircleDashedIcon />
					<span class="text-xs leading-none">Status</span>
				</div>
				<div class="input text-xs">
					<span class="">{card.value.column?.name}</span>
				</div>
				<div class="text-ink-detail flex items-center gap-2">
					<UserIcon />
					<span class="text-xs leading-none">Assignee</span>
				</div>
				<div class="flex items-center">
					<span><Avatar name="U" /></span>
					<span class="ml-1.5 text-xs">Unknown</span>
				</div>
			</div>
		</div>
	</div>
</div>
