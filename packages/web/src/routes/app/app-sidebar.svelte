<script lang="ts">
	import NavBoards from './nav-boards.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {ComponentProps} from 'svelte';
	import NewBoardMenu from './new-board-menu.svelte';
	import {getState} from '$lib/utils.svelte';
	import type {Board} from 'ground-data';

	let {
		initialBoards,
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {initialBoards: Board[]} = $props();

	console.log('initialBoards', initialBoards);

	const boards = getState(initialBoards, x => x.getMyBoards({}));

	const data = {
		user: {
			name: 'Dmitry Tilyupo',
			email: 'tilyupo@gmail.com',
			avatar: '/avatar-example.jpeg',
		},
	};
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<NavUser user={data.user} />
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
