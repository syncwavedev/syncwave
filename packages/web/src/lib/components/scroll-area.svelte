<script lang="ts">
	import {ScrollArea, type WithoutChild} from 'bits-ui';

	type Props = WithoutChild<ScrollArea.RootProps> & {
		orientation: 'vertical' | 'horizontal' | 'both';
	};

	let {
		ref = $bindable(null),
		orientation = 'vertical',
		children,
		...restProps
	}: Props = $props();
</script>

<ScrollArea.Root bind:ref {...restProps}>
	<ScrollArea.Viewport class={restProps.class}>
		{@render children?.()}
	</ScrollArea.Viewport>
	{#if orientation === 'vertical' || orientation === 'both'}
		<ScrollArea.Scrollbar
			orientation="vertical"
			class="hover:bg-dark-10 data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:fade-in-0 flex w-2.5 touch-none rounded-full border-l border-l-transparent p-px transition-all duration-200 select-none hover:w-3"
		>
			<ScrollArea.Thumb
				class="flex-1 rounded-full bg-gray-200 hover:bg-gray-500"
			/>
		</ScrollArea.Scrollbar>
	{/if}
	{#if orientation === 'horizontal' || orientation === 'both'}
		<ScrollArea.Scrollbar
			orientation="horizontal"
			class="hover:bg-dark-10 flex h-2.5 touch-none rounded-full border-t border-t-transparent p-px transition-all duration-200 select-none hover:h-3 "
		>
			<ScrollArea.Thumb
				class="rounded-full bg-gray-200 hover:bg-gray-500"
			/>
		</ScrollArea.Scrollbar>
	{/if}
	<ScrollArea.Corner />
	<ScrollArea.Corner />
</ScrollArea.Root>
<!-- 
<ScrollArea.Root
  class="border-dark-10 bg-background-alt shadow-card relative overflow-hidden rounded-[10px] border px-4 py-4"
>
  <ScrollArea.Viewport class="h-full max-h-[200px] w-full max-w-[200px]">
    <h4
      class="text-foreground mb-4 mt-2 text-xl font-semibold leading-none tracking-[-0.01em]"
    >
      Scroll Area
    </h4>
    <p class="text-foreground-alt text-wrap text-sm leading-5">
      Lorem ipsum dolor sit, amet consectetur adipisicing elit. Dignissimos
      impedit rem, repellat deserunt ducimus quasi nisi voluptatem cumque
      aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
      accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
      adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
      excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic quae
      corrupti autem? Dolorem, sit voluptatum.
    </p>
  </ScrollArea.Viewport>
  <ScrollArea.Corner />
</ScrollArea.Root> -->
