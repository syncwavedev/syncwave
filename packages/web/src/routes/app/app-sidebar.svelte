<script lang="ts">
	import NavBoards from './nav-boards.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {ComponentProps} from 'svelte';
	import NewBoardMenu from './new-board-menu.svelte';
	import {getState, type State} from '$lib/utils.svelte';
	import type {Board, Identity, User} from 'ground-data';

	let {
		initialBoards,
		initialMe,
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		initialBoards: Board[];
		initialMe: {user: User; identity: Identity};
	} = $props();

	const boards = getState(initialBoards, x => x.getMyBoards({}));
	const me = getState(initialMe, x => x.getMe({}));
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<NavUser me={me.value} />
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Boards</Sidebar.GroupLabel>
			<NavBoards boards={boards.value} />
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NewBoardMenu />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
