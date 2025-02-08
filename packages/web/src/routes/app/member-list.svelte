<script lang="ts">
	import {
		BusinessError,
		MEMBER_ROLES,
		ROLE_ORDER,
		type BoardId,
		type MemberAdminDto,
		type MemberId,
		type MemberRole,
	} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import {Trash} from 'lucide-svelte';
	import * as Select from '$lib/components/ui/select/index.js';

	let {members, boardId}: {members: MemberAdminDto[]; boardId: BoardId} =
		$props();

	let sdk = getSdk();

	let email = $state('');
	let role: MemberRole = $state('reader');

	async function createMember(e: SubmitEvent) {
		try {
			e.preventDefault();

			email = email.trim();
			if (email.length === 0) {
				alert('empty email');
				return;
			}

			await sdk(rpc => rpc.createMember({email, boardId, role}));
			email = '';
		} catch (error) {
			if (error instanceof BusinessError) {
				if (error.code === 'user_not_found') {
					alert('User not found');
				} else if (error.code === 'member_exists') {
					alert('Member already exists');
				} else {
					alert('Unknown error');
				}
			}
		}
	}

	async function deleteMember(memberId: MemberId) {
		await sdk(rpc => rpc.deleteMember({memberId}));
	}
</script>

{#each members as member}
	<div>
		[{member.role}] Email: {member.identity?.email ?? 'not provided'}
		<Button
			variant="ghost"
			size="icon"
			onclick={() => deleteMember(member.id)}
		>
			<Trash />
		</Button>
	</div>
{/each}

<form class="flex gap-2" onsubmit={createMember}>
	<Input type="email" bind:value={email} />

	<Select.Root bind:value={role} type="single">
		<Select.Trigger class="w-[180px]">
			{role}
		</Select.Trigger>
		<Select.Content>
			{#each MEMBER_ROLES as role}
				<Select.Item value={role}>{role}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<Button type="submit">Add member</Button>
</form>
