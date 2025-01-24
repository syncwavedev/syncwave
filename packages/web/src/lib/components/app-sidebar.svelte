<script lang="ts" module>
	const data = {
		user: {
			name: 'Dmitry Tilyupo',
			email: 'tilyupo@gmail.com',
			avatar: '/avatar-example.jpeg',
		},
		navMain: [
			{
				title: 'Search',
				url: '#',
				icon: Search,
				isActive: true,
			},
		],
		boards: [
			{
				name: 'Design Engineering',
				description: 'Innovative solutions and product designs.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Sales & Marketing',
				description: 'Strategies to drive growth and customer engagement.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Travel',
				description: 'Exploring new destinations and experiences.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Product Development',
				description: 'Building user-centric products and features.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Finance & Operations',
				description: 'Managing budgets and streamlining processes.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Customer Support',
				description: 'Providing top-notch service and solutions.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Human Resources',
				description: 'Managing talent and building a strong team.',
				url: '#',
				time: '13:45',
			},
			{
				name: 'Research & Development',
				description: 'Pushing the boundaries of innovation and technology.',
				url: '#',
				time: '13:45',
			},
		],
	};
</script>

<script lang="ts">
	import NavBoards from './nav-boards.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {ComponentProps} from 'svelte';
	import {Search} from 'lucide-svelte';
	import NewBoardMenu from './new-board-menu.svelte';
	import {getSdk} from '$lib/utils';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<NavUser user={data.user} />
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Boards</Sidebar.GroupLabel>
			<NavBoards boards={data.boards} />
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NewBoardMenu />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
