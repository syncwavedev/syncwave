<script>
	import Avatar from '$lib/components/avatar.svelte';
	import ArrowUpIcon from '$lib/components/icons/arrow-up-icon.svelte';
	import AttachIcon from '$lib/components/icons/attach-icon.svelte';
	import CircleDashedIcon from '$lib/components/icons/circle-dashed-icon.svelte';
	import EllipsisIcon from '$lib/components/icons/ellipsis-icon.svelte';
	import TimesIcon from '$lib/components/icons/times-icon.svelte';
	import ScrollArea from '$lib/components/scroll-area.svelte';
</script>

<div class="flex h-full flex-col">
	<div class="min-h-0 flex-1">
		<ScrollArea orientation="vertical" type="always" class="hello h-full">
			<div class="px-4">
				<div
					class="bg-subtle-0 dark:bg-subtle-1 sticky top-0 z-20 my-2 flex items-center"
				>
					<div class="text-xs font-semibold">SYNC-1</div>
					<button class="btn--icon ml-auto">
						<EllipsisIcon />
					</button>
					<button class="btn--icon"><TimesIcon /></button>
				</div>
				<textarea
					class="input mb-1 w-full text-xs leading-relaxed"
					rows="5"
					placeholder="Write here..."
				></textarea>
				<div class="flex gap-1">
					<div class="btn--block">
						<CircleDashedIcon />
						<span class="ml-1.5 text-xs">In Progress</span>
					</div>
					<div class="btn--block">
						<span> <Avatar user={{fullName: 'A'}} /></span>
						<span class="ml-1.5 text-xs">Andrei Andreev</span>
					</div>
				</div>
			</div>
			<hr class="-mx-4 mt-2 mb-4" />
			<div class="">
				{#each Array(100).fill(0) as _}
					<div class="mb-4 flex items-center justify-center">
						<div
							class="bg-subtle-1 dark:bg-subtle-2 text-3xs rounded-xl px-2 py-0.5"
						>
							<span class="font-semibold">Andrei</span>
							<span class="text-ink-detail"
								>created Feb 23, 2023</span
							>
						</div>
					</div>
				{/each}
				<div class="mb-4 flex flex-col">
					<div class="flex items-center gap-1.5">
						<div class="text-[1.325em]">
							<Avatar user={{fullName: 'A'}} />
						</div>
						<div class="flex items-baseline gap-1.5">
							<div class="text-3xs font-semibold">Andrei</div>
							<div class="text-4xs text-ink-detail">2h ago</div>
						</div>
					</div>
					<div
						class="ml-[calc(1.325em+0.5rem)] text-xs leading-relaxed"
					>
						Assigned to me, starting now.
					</div>
				</div>
			</div>
		</ScrollArea>
	</div>
	<div
		class="border-divider bg-subtle-0 dark:bg-subtle-1 z-10 flex shrink-0 items-center gap-1 border-t p-2"
	>
		<button class="btn--icon mt-auto">
			<AttachIcon />
		</button>
		<textarea
			class="input flex-grow text-xs leading-relaxed"
			rows="1"
			placeholder="Type a message..."
		></textarea>
		<button class="btn--icon btn--icon--ink mt-auto">
			<ArrowUpIcon />
		</button>
	</div>
</div>
