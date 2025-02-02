<script lang="ts">
	import AuthHeader from '../auth-header.svelte';
	import UserAuthForm from '../user-auth-form.svelte';

	const {data} = $props();
</script>

<div class="container relative flex-col items-center justify-center lg:px-0">
	<AuthHeader />

	<div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
		<UserAuthForm variant="sign-up" redirectUrl={data.redirectUrl} />
	</div>
</div>
