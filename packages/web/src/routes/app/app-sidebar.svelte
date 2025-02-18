<script lang="ts">
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type {ComponentProps} from 'svelte';
	import NewBoardMenu from './new-board-menu.svelte';
	import {observe, type Observable} from '$lib/utils.svelte';
	import type {Identity, MemberDto, UserDto} from 'syncwave-data';
	import NavMemberListController from './nav-member-list-controller.svelte';

	let {
		initialMyMembers,
		initialMe,
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		initialMyMembers: MemberDto[];
		initialMe: {user: UserDto; identity: Identity};
	} = $props();

	const members = observe(initialMyMembers, x => x.getMyMembers({}));
	const me = observe(initialMe, x => x.getMe({}));
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<NavUser me={me.value} />
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<NavMemberListController members={members.value} />
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NewBoardMenu />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
