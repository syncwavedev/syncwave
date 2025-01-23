<script lang="ts" module>
	import AudioWaveform from 'lucide-svelte/icons/audio-waveform';
	import BookOpen from 'lucide-svelte/icons/book-open';
	import Bot from 'lucide-svelte/icons/bot';
	import ChartPie from 'lucide-svelte/icons/chart-pie';
	import Command from 'lucide-svelte/icons/command';
	import Frame from 'lucide-svelte/icons/frame';
	import GalleryVerticalEnd from 'lucide-svelte/icons/gallery-vertical-end';
	import Map from 'lucide-svelte/icons/map';
	import Settings2 from 'lucide-svelte/icons/settings-2';
	import SquareTerminal from 'lucide-svelte/icons/square-terminal';

	// This is sample data.
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
			},
			{
				name: 'Sales & Marketing',
				description: 'Strategies to drive growth and customer engagement.',
				url: '#',
			},
			{
				name: 'Travel',
				description: 'Exploring new destinations and experiences.',
				url: '#',
			},
			{
				name: 'Product Development',
				description: 'Building user-centric products and features.',
				url: '#',
			},
			{
				name: 'Finance & Operations',
				description: 'Managing budgets and streamlining processes.',
				url: '#',
			},
			{
				name: 'Customer Support',
				description: 'Providing top-notch service and solutions.',
				url: '#',
			},
			{
				name: 'Human Resources',
				description: 'Managing talent and building a strong team.',
				url: '#',
			},
			{
				name: 'Research & Development',
				description: 'Pushing the boundaries of innovation and technology.',
				url: '#',
			},
		],
	};
</script>

<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavBoards from './nav-boards.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {ComponentProps} from 'svelte';
	import {Search} from 'lucide-svelte';

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
	<Sidebar.Rail />
</Sidebar.Root>
