<script lang="ts">
	import Dialog from '../dialog.svelte';
	import EditProfileDialogFrozenContent from './edit-profile-dialog-content-frozen.svelte';
	import type {User} from 'syncwave-data';
	import {getAgent} from '../../agent/agent.svelte';
	import {getRpc} from '../../utils';

	interface Props {
		open: boolean;
		onClose: () => void;
		profile: User;
	}

	let {open, onClose, profile: initialProfile}: Props = $props();

	const agent = getAgent();
	const profile = agent.observeProfile(initialProfile);
</script>

<Dialog {open} {onClose}>
	{#key profile.id}
		<EditProfileDialogFrozenContent {profile} {onClose} />
	{/key}
</Dialog>
