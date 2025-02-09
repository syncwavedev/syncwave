<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import {ScrollArea} from '$lib/components/ui/scroll-area';
	import type {UserDto} from 'syncwave-data';
	import EditUser from './edit-user.svelte';

	let {user, open = $bindable()}: {user: UserDto; open: boolean} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Description>Edit user: {user.fullName}</Dialog.Description>
		</Dialog.Header>
		<ScrollArea class="max-h-[80vh]">
			<EditUser {user} />
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
