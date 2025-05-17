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
        onSelect?: (event: Event) => void;
    };

    type Props = DropdownMenuRootProps & {
        items: (MenuItem | null)[];
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
            class="z-100 bg-material-elevated p-1 rounded-md min-w-48 border border-divider-elevated outline-none shadow-sm"
        >
            <DropdownMenu.Group>
                {#each items.filter(x => x !== null) as item (item.text)}
                    <DropdownMenu.Item
                        textValue={item.text}
                        onSelect={item.onSelect}
                    >
                        <div
                            class="flex items-center gap-1.5 hover:bg-material-elevated-hover px-2 py-1.25 rounded-sm cursor-default outline-none"
                        >
                            <item.icon />
                            {item.text}
                            {#if item.shortcut}
                                <span class="ml-auto text-ink-detail"
                                    >{item.shortcut}</span
                                >
                            {/if}
                        </div>
                    </DropdownMenu.Item>
                {/each}
            </DropdownMenu.Group>
        </DropdownMenu.Content>
    </DropdownMenu.Portal>
</DropdownMenu.Root>
