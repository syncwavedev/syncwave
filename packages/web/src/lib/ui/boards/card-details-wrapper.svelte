<script lang="ts">
	import {observeAsync} from '$lib/utils.svelte';
	import type {CardView} from '$lib/sdk/view.svelte';
	import CardDetails from './card-details.svelte';

	const {
		initialCard,
	}: {
		initialCard: CardView;
	} = $props();

	const card = observeAsync(x => x.getCardView({cardId: initialCard.id}));
</script>

{#await card then card}
	<CardDetails initialCard={card.value} />
{/await}
