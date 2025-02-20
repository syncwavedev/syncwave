<script lang="ts">
	import ScrollArea from '$lib/components/scroll-area.svelte';
	import UploadButton from '$lib/components/upload-button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';

	const sdk = getSdk();
	const userId = getAuthManager().getIdentityInfo()?.userId!;
</script>

<div class="flex flex-col gap-4">testbed</div>

<ScrollArea
	orientation="both"
	type="always"
	class="max-h-[200px] max-w-[200px]"
>
	<h4
		class="text-foreground mt-2 mb-4 text-xl leading-none font-semibold tracking-[-0.01em]"
	>
		Scroll Area
	</h4>
	<p class="text-foreground-alt w-[400px] text-sm leading-5 text-wrap">
		Lorem ipsum dolor sit, amet consectetur adipisicing elit. Dignissimos
		impedit rem, repellat deserunt ducimus quasi nisi voluptatem cumque
		aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit
		voluptatum.Lorem ipsum dolor sit, amet consectetur adipisicing elit.
		Dignissimos impedit rem, repellat deserunt ducimus quasi nisi voluptatem
		cumque aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit
		voluptatum.Lorem ipsum dolor sit, amet consectetur adipisicing elit.
		Dignissimos impedit rem, repellat deserunt ducimus quasi nisi voluptatem
		cumque aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit
		voluptatum.Lorem ipsum dolor sit, amet consectetur adipisicing elit.
		Dignissimos impedit rem, repellat deserunt ducimus quasi nisi voluptatem
		cumque aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit
		voluptatum.Lorem ipsum dolor sit, amet consectetur adipisicing elit.
		Dignissimos impedit rem, repellat deserunt ducimus quasi nisi voluptatem
		cumque aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit
		voluptatum.Lorem ipsum dolor sit, amet consectetur adipisicing elit.
		Dignissimos impedit rem, repellat deserunt ducimus quasi nisi voluptatem
		cumque aliquid esse ea deleniti eveniet incidunt! Deserunt minus laborum
		accusamus iusto dolorum. Lorem ipsum dolor sit, amet consectetur
		adipisicing elit. Blanditiis officiis error minima eos fugit voluptate
		excepturi eveniet dolore et, ratione impedit consequuntur dolorem hic
		quae corrupti autem? Dolorem, sit voluptatum.Lorem ipsum dolor sit, amet
		consectetur adipisicing elit. Dignissimos impedit rem, repellat deserunt
		ducimus quasi nisi voluptatem cumque aliquid esse ea deleniti eveniet
		incidunt! Deserunt minus laborum accusamus iusto dolorum. Lorem ipsum
		dolor sit, amet consectetur adipisicing elit. Blanditiis officiis error
		minima eos fugit voluptate excepturi eveniet dolore et, ratione impedit
		consequuntur dolorem hic quae corrupti autem? Dolorem, sit voluptatum.
	</p>
</ScrollArea>
