<script lang="ts">
	import type {Component, Snippet} from 'svelte';
	import {
		DropdownMenu,
		type DropdownMenuContentProps,
		type DropdownMenuRootProps,
		type WithoutChild,
	} from 'bits-ui';

	type MenuItem = {
		icon: Component;
		text: string;
		shortcut?: string;
	};

	type Props = DropdownMenuRootProps & {
		items: MenuItem[];
		contentProps?: WithoutChild<DropdownMenuContentProps>;
		children?: Snippet;
	};

	let {children, items, contentProps, ...restProps}: Props = $props();

	let open = $state(false);
</script>

<DropdownMenu.Root bind:open {...restProps}>
	<DropdownMenu.Trigger>
		<button onclick={() => (open = true)}>
			{@render children?.()}
		</button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			side="bottom"
			sideOffset={0}
			align="end"
			alignOffset={0}
			preventOverflowTextSelection={true}
			{...contentProps}
			class="z-100 bg-subtle-2 p-1 rounded-md min-w-40 border border-divider-object outline-none"
		>
			<DropdownMenu.Group>
				{#each items as item (item.text)}
					<DropdownMenu.Item textValue={item.text}>
						<div
							class="flex items-center dark:hover:bg-slate-750 hover:bg-gray-100 px-2 py-0.25 rounded-sm cursor-pointer outline-none"
						>
							<span class="mr-1.5"><item.icon /></span>
							<span class="text-xs">{item.text}</span>
							{#if item.shortcut}
								<span class="ml-auto text-ink-detail">{item.shortcut}</span>
							{/if}
						</div>
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
