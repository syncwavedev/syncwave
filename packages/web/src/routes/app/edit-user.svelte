<script lang="ts">
	import {Input} from '$lib/components/ui/input';
	import {getSdk} from '$lib/utils';
	import {
		Crdt,
		parseCrdtDiff,
		stringifyCrdtDiff,
		type UserDto,
	} from 'syncwave-data';

	let {user: remoteUser}: {user: UserDto} = $props();
	console.log('user state', $state.snapshot(remoteUser));
	const localUser = Crdt.load(remoteUser.state);
	$effect(() => {
		localUser.apply(parseCrdtDiff(remoteUser.state));
		newFullName = localUser.snapshot().fullName;
	});

	let newFullName = $state(remoteUser.fullName);

	const sdk = getSdk();

	async function setUserFullName() {
		const diff = localUser.update(x => {
			x.fullName = newFullName;
		});
		if (diff) {
			await sdk(rpc =>
				rpc.applyUserDiff({
					userId: remoteUser.id,
					diff: stringifyCrdtDiff(diff),
				})
			);
		}
	}
</script>

<div>
	Edit user: {remoteUser.id}
	<div>
		<Input
			bind:value={newFullName}
			oninput={setUserFullName}
			placeholder="Full name"
		/>
	</div>
</div>
