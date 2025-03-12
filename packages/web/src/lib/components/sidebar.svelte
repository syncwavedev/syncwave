<script lang="ts">
	import Avatar from '$lib/components/avatar.svelte';
	import CogIcon from '$lib/components/icons/cog-icon.svelte';
	import PanelRightIcon from '$lib/components/icons/panel-right-icon.svelte';
	import type {Identity, MemberDto, UserDto} from 'syncwave-data';
	import PlusIcon from './icons/plus-icon.svelte';
	import SearchIcon from './icons/search-icon.svelte';
	import {observe} from '$lib/utils.svelte';
	import BoardItem from './board-item.svelte';

	let {
		initialMe,
		initialMyMembers,
		ontoggle,
	}: {
		initialMe: {user: UserDto; identity: Identity};
		initialMyMembers: MemberDto[];
		ontoggle: () => void;
	} = $props();

	const me = observe(initialMe, x => x.getMe({}));
	const myMembers = observe(initialMyMembers, x => x.getMyMembers({}));
</script>

<div class="h-screen">
	<div class="action-bar sticky top-0 flex">
		<button class="btn--icon"><SearchIcon /></button>
		<button class="btn--icon ml-auto" onclick={ontoggle}>
			<PanelRightIcon />
		</button>
		<button class="btn--icon"><PlusIcon /></button>
	</div>

	<div class="mt-2 flex flex-col items-start overflow-y-auto text-sm">
		{#each myMembers.value as myMember (myMember.id)}
			<BoardItem board={myMember.board} />
		{/each}
	</div>
	<div class="action-bar mt-auto mb-2">
		<div class="hover-subtle-1 flex h-full items-center rounded-full px-2">
			<button class="btn text-[1.5em]">
				<Avatar user={me.value.user} />
			</button>
			<span class="text-ink-body ml-2 text-xs"
				>{me.value.user.fullName}</span
			>
		</div>
		<button class="btn--icon ml-auto text-base">
			<CogIcon />
		</button>
	</div>
</div>
