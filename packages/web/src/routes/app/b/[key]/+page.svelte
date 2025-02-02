<script lang="ts">
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import {Separator} from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {getState} from '$lib/utils.svelte';

	const {data} = $props();
	const {boardKey, initialBoard} = data;

	const board = getState(initialBoard, x => x.getBoard({key: boardKey}));
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>
	<div class="flex items-center gap-2 px-4">
		<Sidebar.Trigger class="-ml-1" />
		{#await board then board}
			<Separator orientation="vertical" class="mr-2 h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="#">{board.value?.key}</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		{/await}
	</div>
</header>
<div class="p-4">Board {board.value?.id} - {board.value?.createdAt}</div>
