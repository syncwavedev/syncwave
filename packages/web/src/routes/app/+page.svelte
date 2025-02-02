<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import {Separator} from '$lib/components/ui/separator';
	import * as Sidebar from '$lib/components/ui/sidebar';

	const auth = getAuthManager();
	const idInfo = auth.getIdentityInfo();
</script>

<header
	class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
>
	<div class="flex items-center gap-2 px-4">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-2 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item class="hidden md:block">
					<Breadcrumb.Link href="#">Ground board</Breadcrumb.Link>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
</header>
<div class="p-4">
	{#if idInfo}
		<div>
			<Button onclick={() => auth.logOut()}>Log out</Button>
		</div>
		User: {idInfo.userId}
	{:else}
		<Button href="/auth/log-in">Log in</Button>
	{/if}
</div>
