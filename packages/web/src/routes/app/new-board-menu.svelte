<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {Plus} from 'lucide-svelte';
	import {Button} from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {ScrollArea} from '$lib/components/ui/scroll-area';
	import AddBoardWizard from './add-board-wizard.svelte';

	let addBoardWizardOpen = $state(false);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			onclick={() => (addBoardWizardOpen = !addBoardWizardOpen)}
			size="lg"
			class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
		>
			{#snippet child({props}: any)}
				<div href="/" {...props}>
					<Button class="h-8 w-8 shrink-0" variant="ghost" size="icon">
						<Plus />
					</Button>

					<div class="min-w-0">
						<div class="flex justify-between">
							<div class="truncate">New board</div>
						</div>
					</div>
				</div>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<Dialog.Root bind:open={addBoardWizardOpen}>
	<Dialog.Content>
		<AddBoardWizard onCreate={() => (addBoardWizardOpen = false)} />
	</Dialog.Content>
</Dialog.Root>
