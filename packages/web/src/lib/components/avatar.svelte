<script lang="ts">
	import type {Snippet} from 'svelte';
	import type {UserDto} from 'syncwave-data';

	let {user}: {user: UserDto} = $props();
</script>

<div
	class="grid h-[1em] w-[1em] place-items-center rounded-full bg-[#3F6B7E] text-white"
>
	<div class="text-[0.45em] font-semibold">
		{user.fullName[0]?.toUpperCase() ?? ''}
	</div>
</div>
