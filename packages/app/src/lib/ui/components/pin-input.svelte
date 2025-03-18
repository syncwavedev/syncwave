<script lang="ts">
	import {
		PinInput,
		REGEXP_ONLY_DIGITS,
		type PinInputRootSnippetProps,
	} from 'bits-ui';

	let {
		onComplete,
		autoFocus,
		value = $bindable(),
		disabled = false,
	}: {
		onComplete: () => void;
		autoFocus: boolean;
		value: string;
		disabled: boolean;
	} = $props();

	type CellProps = PinInputRootSnippetProps['cells'][0];
</script>

<PinInput.Root
	bind:value
	class="group/pininput text-foreground has-disabled:opacity-30 flex items-center justify-center"
	maxlength={6}
	autofocus={autoFocus}
	pushPasswordManagerStrategy="none"
	{onComplete}
	pattern={REGEXP_ONLY_DIGITS}
	{disabled}
>
	{#snippet children({cells})}
		<div class="flex">
			{#each cells.slice(0, 3) as cell, i (i)}
				<!-- Added key (i) -->
				{@render Cell(cell)}
			{/each}
		</div>

		<div class="flex w-9 items-center justify-center">
			<div class="bg-divider h-1 w-3 rounded-full"></div>
		</div>

		<div class="flex">
			{#each cells.slice(3, 6) as cell, i (i + 3)}
				<!-- Added key (i+3) -->
				{@render Cell(cell)}
			{/each}
		</div>
	{/snippet}
</PinInput.Root>

{#snippet Cell(cell: CellProps)}
	<PinInput.Cell
		{cell}
		class="relative h-[2.6em] w-[2em] flex items-center justify-center transition-all duration-75 border-divider border-y border-r first:rounded-l-md first:border-l last:rounded-r-md group-focus-within/pininput:border-divider-object group-hover/pininput:border-divider-object outline-0 data-active:outline-1 data-active:outline-text-ink"
	>
		{#if cell.char !== null}
			<div>
				{cell.char}
			</div>
		{/if}
		{#if cell.hasFakeCaret}
			<div
				class="animate-caret-blink pointer-events-none absolute inset-0 flex items-center justify-center"
			>
				<div class="h-[1.8em] w-px bg-ink"></div>
			</div>
		{/if}
	</PinInput.Cell>
{/snippet}
