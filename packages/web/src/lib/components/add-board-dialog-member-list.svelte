<script lang="ts">
	import TimesIcon from './icons/times-icon.svelte';
	import ArrowLeftIcon from './icons/arrow-left-icon.svelte';
	import Avatar from './avatar.svelte';

	interface Props {
		onBack: () => void;
		members: string[];
		onDone: () => void;
	}

	let email = $state('');

	function addMember(e: Event) {
		e.preventDefault();
		members = members.filter(x => x !== email);
		if (email) {
			members = [email, ...members];
			email = '';
		}
	}

	let {onBack, members = $bindable(), onDone}: Props = $props();
</script>

<form onsubmit={addMember} class="my-2 flex h-[2.5em] items-center px-4">
	<button type="button" onclick={onBack} class="btn--icon"
		><ArrowLeftIcon /></button
	>
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
<div class="mx-2 my-2 flex flex-col">
	{#each members as email}
		<div class="flex items-center p-2">
			<button class="btn text-[2em]">
				<Avatar user={{fullName: 'A'} as any} />
			</button>
			<span class="ml-1.5 text-xs">{email}</span>
			<button
				onclick={() => (members = members.filter(x => x !== email))}
				class="btn--icon ml-auto"
			>
				<TimesIcon />
			</button>
		</div>
	{/each}
</div>
<hr />
<button onclick={onDone} class="btn--block mx-4 my-2 ml-auto">
	<span class="text-xs">Done</span>
</button>
