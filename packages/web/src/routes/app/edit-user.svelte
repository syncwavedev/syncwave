<script lang="ts">
	import {Input} from '$lib/components/ui/input';
	import {getSdk} from '$lib/utils';
	import type {UserDto} from 'syncwave-data';

	let {user}: {user: UserDto} = $props();

	let fullName = $state(user.fullName);

	$effect(() => {
		fullName = user.fullName;
	});

	const sdk = getSdk();

	async function setUserFullName() {
		await sdk(rpc =>
			rpc.setUserFullName({userId: user.id, fullName: fullName})
		);
	}
</script>

<div>
	Edit user: {user.id}
	<div>
		<Input
			bind:value={fullName}
			onchange={setUserFullName}
			placeholder="Full name"
		/>
	</div>
</div>
