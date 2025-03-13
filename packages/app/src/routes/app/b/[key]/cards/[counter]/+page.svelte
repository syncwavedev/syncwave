<script>
	import CardPageFrozen from '$lib/components/card-page-frozen.svelte';
	import ResizablePane from '$lib/components/resizable-pane.svelte';
	import {getUniversalStore} from '$lib/utils';

	let {data} = $props();
	let {boardKey, counter, initialCard} = $derived(data);

	const store = getUniversalStore();
	const cardPanelSizeKey = 'cps';
	const defaultSize = Number.parseInt(store.get(cardPanelSizeKey) || '450');
</script>

{#key initialCard.id}
	<ResizablePane
		freeSide="left"
		{defaultSize}
		minWidth={350}
		maxWidth={550}
		resizerClass="w-2 cursor-col-resize"
		onWidthChange={width =>
			store.set(cardPanelSizeKey, Math.round(width).toString())}
	>
		<CardPageFrozen {boardKey} {counter} {initialCard} />
	</ResizablePane>
{/key}
