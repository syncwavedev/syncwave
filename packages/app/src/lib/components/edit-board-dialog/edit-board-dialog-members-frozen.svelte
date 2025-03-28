<script lang="ts">
	import TimesIcon from '../icons/times-icon.svelte';
	import ArrowLeftIcon from '../icons/arrow-left-icon.svelte';
	import Avatar from '../avatar.svelte';
	import {
		assert,
		BusinessError,
		canManageRole,
		type BoardId,
		type MemberAdminDto,
		type MemberId,
	} from 'syncwave';
	import {getMe, getRpc, markErrorAsHandled} from '../../utils';
	import ScrollArea from '../scroll-area.svelte';

	interface Props {
		onBack: () => void;
		onClose: () => void;
		boardId: BoardId;
		members: MemberAdminDto[];
	}

	let {onBack, onClose, members, boardId}: Props = $props();

	let email = $state('');

	const rpc = getRpc();
	async function addMember(e: Event) {
		e.preventDefault();

		try {
			await rpc(x => x.createMember({boardId, email, role: 'writer'}));
			email = '';
		} catch (error) {
			if (error instanceof BusinessError) {
				if (error.code === 'member_exists') {
					alert(
						'This member already exists in the board. Please check the email address.'
					);
					markErrorAsHandled(error);
				}
			}
		}
	}

	async function removeMember(memberId: MemberId) {
		if (!confirm('Are you sure you want to remove this member?')) return;

		try {
			await rpc(x => x.deleteMember({memberId}));
		} catch (error) {
			if (error instanceof BusinessError) {
				if (error.code === 'last_owner') {
					alert(
						'You cannot remove the last owner of the board. Please promote another member to owner before removing this one.'
					);
					markErrorAsHandled(error);
				}
			}

			throw error;
		}
	}

	const me = getMe();
	const meMemberOptional = members.find(x => x.userId === me.value.user.id);
	assert(meMemberOptional !== undefined, 'Me member not found');
	const meMember = meMemberOptional;

	let lastOwner = $derived(
		members.filter(x => x.role === 'owner').length === 1
	);

	function getRemoveDisabledReason(member: MemberAdminDto) {
		if (!canManageRole(meMember.role, member.role)) {
			return (
				"You don't have enough permissions to remove this member: " +
				meMember.role
			);
		}
		if (member.role === 'owner' && lastOwner) {
			return 'Owner cannot be removed.';
		}

		return undefined;
	}
</script>

<div class="h-dialog flex flex-col">
	<div class="shrink-0">
		<form onsubmit={addMember} class="my-2 flex h-[2.5em] items-center px-4">
			<button type="button" onclick={onBack} class="btn--icon">
				<ArrowLeftIcon />
			</button>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				autocomplete="off"
				type="email"
				bind:value={email}
				class="input ml-1.5 text-xs"
				placeholder="Enter an email to add a member..."
				autofocus
			/>
			<input type="submit" class="hidden" value="Add member" />
		</form>
		<hr />
	</div>
	<div class="min-h-0 flex-1">
		<ScrollArea orientation="both" class="h-full">
			<div class="mx-2 my-2 flex flex-col">
				{#each members as member (member.id)}
					{@const removeDisabledReason = getRemoveDisabledReason(member)}
					<div class="flex items-center p-2">
						<button class="btn text-[2em]">
							<Avatar user={{fullName: 'A'} as any} />
						</button>
						<span class="ml-1.5 text-xs">
							{member.identity?.email ?? member.user.fullName}
						</span>
						<span class="text-second mr-1.5 ml-auto text-xs">
							{member.role}
						</span>
						{#if removeDisabledReason === undefined}
							<button onclick={() => removeMember(member.id)} class="btn--icon">
								<TimesIcon />
							</button>
						{:else}
							<button
								onclick={() => alert(removeDisabledReason)}
								title={removeDisabledReason}
								class="btn--icon cursor-not-allowed"
							>
								<TimesIcon />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</ScrollArea>
	</div>
	<div class="shrink-0">
		<hr />
		<button onclick={onClose} class="btn--block mx-4 my-2 ml-auto">
			<span class="text-xs">Done</span>
		</button>
	</div>
</div>
