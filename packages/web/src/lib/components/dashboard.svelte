<script lang="ts">
	import Avatar from '$lib/components/avatar.svelte';
	import CogIcon from '$lib/components/icons/cog-icon.svelte';
	import PanelRightIcon from '$lib/components/icons/panel-right-icon.svelte';
	import type {Identity, MemberDto, UserDto} from 'syncwave-data';
	import PlusIcon from './icons/plus-icon.svelte';
	import SearchIcon from './icons/search-icon.svelte';
	import {observe} from '$lib/utils.svelte';
	import MyMemberListController from './board-list-controller.svelte';

	let {
		initialMyMembers,
	}: {
		initialMyMembers: MemberDto[];
	} = $props();

	const myMembers = observe(initialMyMembers, x => x.getMyMembers({}));
</script>

<div class="mt-2 flex flex-col items-start overflow-y-auto text-sm">
	<MyMemberListController members={myMembers.value} />
</div>
