<script lang="ts">
	import {Button} from '$lib/components/ui/button/index.js';
	import AuthHeader from '../(components)/auth-header.svelte';
	import UserAuthForm from '../(components)/user-auth-form.svelte';

	let {data} = $props();
</script>

<div class="container relative flex-col items-center justify-center lg:px-0">
	<AuthHeader />

	<div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
		<UserAuthForm variant="log-in" redirectUrl={data.redirectUrl} />
	</div>
</div>
