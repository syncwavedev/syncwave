<script lang="ts">
    import {Select} from 'bits-ui';
    import CheckIcon from './icons/check-icon.svelte';
    import type {Snippet} from 'svelte';

    interface SelectOption {
        value?: string;
        label: string;
        disabled?: boolean;
    }

    let {
        options,
        value = $bindable(),
        onValueChange,
        disabled = false,
        children,
    }: {
        options: SelectOption[];
        value: string | undefined;
        onValueChange?: (value: string) => void;
        disabled?: boolean;
        children?: Snippet | undefined;
    } = $props();
</script>

<Select.Root type="single" {disabled} value={value ?? ''} {onValueChange}>
    <Select.Trigger>
        {@render children?.()}
    </Select.Trigger>
    <Select.Portal>
        <Select.Content
            class="z-100 bg-material-elevated p-1 rounded-md min-w-40 border border-divider-elevated outline-none shadow-sm"
            side="bottom"
            sideOffset={0}
            align="end"
            alignOffset={0}
            preventOverflowTextSelection={true}
        >
            <Select.Viewport>
                {#each options as option (option.value)}
                    <Select.Item
                        value={option.value ?? ''}
                        label={option.label}
                        disabled={option.disabled}
                        class="flex items-center hover:bg-material-elevated-hover px-2 py-1.25 rounded-sm cursor-default outline-none"
                    >
                        {#snippet children({selected})}
                            <span class="truncate">{option.label}</span>
                            {#if selected}
                                <span class="ml-auto">
                                    <CheckIcon />
                                </span>
                            {/if}
                        {/snippet}
                    </Select.Item>
                {/each}
            </Select.Viewport>
        </Select.Content>
    </Select.Portal>
</Select.Root>
