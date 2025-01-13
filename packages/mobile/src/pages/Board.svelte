<script lang="ts">
	import Avatar from '../components/Avatar.svelte';
	import Inbox from '../components/icons/Inbox.svelte';
	import Plus from '../components/icons/Plus.svelte';
	import Search from '../components/icons/Search.svelte';
	import NavigationStack from '../components/mobile/NavigationStack.svelte';
	import TasksList from '../components/tasks/TasksList.svelte';
	import {board} from '../lib/mock';

	let searchActive = $state(false);

	const onSearch = () => {
		searchActive = true;
	};
</script>

{#snippet trailing()}
	<button class="btn btn--icon">
		<Avatar title={board.name} />
	</button>
{/snippet}

{#snippet bottomToolbar()}
	<div class="flex align-center justify-between">
		<button onclick={onSearch} class="btn btn--icon">
			<Search />
		</button>
		<button class="btn btn--icon">
			<Inbox />
		</button>
		<button class="btn btn--icon">
			<Plus />
		</button>
	</div>
{/snippet}

<NavigationStack
	navigationTitle={board.name}
	backButton
	{trailing}
	{bottomToolbar}
	bind:searchActive
	scrollTopOnTitleClick
>
	<TasksList {board} />
</NavigationStack>
