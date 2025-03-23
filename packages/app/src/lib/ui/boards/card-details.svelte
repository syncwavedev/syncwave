<script lang="ts">
	import Avatar from '../components/avatar.svelte';
	import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
	import LinkIcon from '../components/icons/link-icon.svelte';
	import TrashIcon from '../components/icons/trash-icon.svelte';
	import TimesIcon from '../components/icons/times-icon.svelte';
	import CircleDashedIcon from '../components/icons/circle-dashed-icon.svelte';
	import UserIcon from '../components/icons/user-icon.svelte';
	import Editor from '../../components/editor.svelte';
	import type {BoardTreeView, CardView} from '../../agent/view.svelte';
	import {getAgent} from '../../agent/agent.svelte';
	import type {Awareness} from '../../../../../data/dist/esm/src/awareness';
	import type {User} from 'syncwave-data';
	import {onMount, tick} from 'svelte';

	const {
		card,
		board,
		awareness,
		me,
	}: {
		card: CardView;
		board: BoardTreeView;
		awareness: Awareness;
		me: User;
	} = $props();

	const agent = getAgent();

	let editor: Editor | null = $state(null);

	onMount(() => {
		tick().then(() => {
			if (card.isDraft && editor) {
				editor.focus();
			}
		});
	});
</script>

<div
	class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex w-124 min-w-84 flex-shrink-0 flex-col border-l"
>
	<!-- Scrollable Content Section -->
	<div class="flex-grow overflow-y-auto">
		<!-- Header with Context Menu -->
		<div
			class="bg-subtle-0 dark:bg-subtle-1 border-divider sticky top-0 z-20 flex items-center px-4 py-1"
		>
			<div class="text-xs font-medium">
				{card.board.key}–{card.counter}
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
			<button class="btn--icon" onclick={() => history.back()}>
				<TimesIcon />
			</button>
		</div>
		<div class="mx-4 mt-1">
			<!-- Task Description -->
			<div class="input mb-2 w-full text-xs leading-relaxed">
				<Editor
					bind:this={editor}
					class="min-h-[100px]"
					placeholder="Write here..."
					fragment={card.text.__fragment!}
					{awareness}
					{me}
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
					<span class="">{card.column?.name}</span>
				</div>
				<div class="text-ink-detail flex items-center gap-2">
					<UserIcon />
					<span class="text-xs leading-none">Assignee</span>
				</div>
				<div class="flex items-center">
					<span><Avatar name="U" /></span>
					<span class="ml-1.5 text-xs">Unknown</span>
				</div>
				<button
					class="btn--block"
					onclick={() => agent.setCardColumn(card.id, board.columns[0].id)}
				>
					To {board.columns[0].name}
				</button>
			</div>
		</div>
	</div>
</div>
