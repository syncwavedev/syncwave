<script lang="ts">
	import {
		assert,
		log,
		stringifyCrdtDiff,
		toPosition,
		type Member,
		type MemberDto,
		type CrdtDoc,
	} from 'syncwave-data';
	import {
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		type DndEvent,
	} from 'svelte-dnd-action';
	import {compareBigFloat, type BigFloat} from 'syncwave-data';
	import {getSdk} from '$lib/utils';
	import {untrack} from 'svelte';
	import NavMemberList from './nav-member-list.svelte';
	import {SetCrdt} from '$lib/crdt/set-crdt';
	import {MyMemberListCrdt} from '$lib/crdt/my-member-list-crdt';
	import {calculateChange} from '$lib/dnd';

	let {members: remoteMembers}: {members: MemberDto[]} = $props();

	const localMembers = new MyMemberListCrdt(remoteMembers);
	$effect(() => {
		localMembers.apply(remoteMembers);
		const latestMembers = applyOrder([...localMembers.snapshot()]);
		untrack(() => {
			const shadowMember = dndMembers.find(
				item => (item as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]
			);

			dndMembers = latestMembers.map(member =>
				member.id === shadowMember?.id
					? {
							...shadowMember,
							...member,
						}
					: member
			);
		});
	});

	function applyOrder<T extends Member>(members: T[]): T[] {
		return [...members].sort((a, b) =>
			compareBigFloat(a.position, b.position)
		);
	}

	let dndMembers = $state(
		applyOrder($state.snapshot(remoteMembers) as MemberDto[])
	);

	const sdk = getSdk();

	function setMembers(e: CustomEvent<DndEvent<MemberDto>>) {
		const newDndMembers = e.detail.items;

		const update = calculateChange(
			localMembers.snapshot(),
			dndMembers,
			newDndMembers,
			member => member?.position
		);

		if (update) {
			const {target, newPosition} = update;
			const diff = localMembers.setPosition(target, newPosition);

			if (diff) {
				sdk(x =>
					x.applyMemberDiff({
						memberId: target,
						diff: stringifyCrdtDiff(diff),
					})
				).catch(error => {
					log.error(error, 'failed to send member diff');
				});
			}
		}

		dndMembers = newDndMembers;
	}
</script>

<NavMemberList
	members={dndMembers}
	handleDndConsiderMembers={setMembers}
	handleDndFinalizeMembers={setMembers}
/>
