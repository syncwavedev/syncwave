<script lang="ts" generics="T">
	import {untrack, type Snippet} from 'svelte';
	import {sineOut} from 'svelte/easing';
	import {DND_REORDER_DURATION_MS} from '../boards/board-dnd';

	type Key = string;

	interface Props {
		items: T[];
		gap: number;
		renderItem: Snippet<[T]>;
		key: (item: T) => Key;
	}

	let {items, renderItem, gap, key}: Props = $props();
	let container: HTMLDivElement | null = $state(null);

	let shadow: T[] = $state([]);

	$effect(() => {
		const itemKeys = new Set(items.map(key));

		untrack(() => {
			const shadowKeys = new Set(shadow.map(key));

			const removedItems = new Set<Key>();
			shadowKeys.forEach(k => {
				if (!itemKeys.has(k)) {
					removedItems.add(k);
				}
			});

			shadow = shadow.filter(item => !removedItems.has(key(item)));

			items.forEach(item => {
				const k = key(item);
				if (!shadowKeys.has(k)) {
					shadow.push(item);
				}
			});
		});
	});

	$effect(() => {
		let cancelled = false;

		function tick() {
			if (!container) return;

			const elementMap = new Map<Key, HTMLElement>();

			const containerChildren = container.children;
			let containerHeight = 0;
			for (let i = 0; i < containerChildren.length; i += 1) {
				const element = container.children[i] as HTMLElement;
				const key = element.dataset.key!;
				elementMap.set(key, element);

				containerHeight += element.offsetHeight + (i === 0 ? 0 : gap);
			}

			let targetY = 0;

			container.style.height = `${containerHeight}px`;

			const now = performance.now();

			function setY(element: HTMLElement, y: number) {
				element.style.transform = `translateY(${y}px)`;
				element.dataset.currentY = y.toString();
			}

			for (const item of items) {
				const k = key(item);
				const element = elementMap.get(k);

				if (!element) return;

				if (element.dataset.targetY !== targetY.toString()) {
					element.dataset.targetY = targetY.toString();
					const deadline = now + DND_REORDER_DURATION_MS;
					element.dataset.deadline = deadline.toString();
				}

				// freshman
				if (element.dataset.currentY === undefined) {
					setY(element, targetY);
				}

				const currentY = parseInt(element.dataset.currentY!, 10);

				if (targetY !== currentY) {
					const deadline = parseInt(element.dataset.deadline!, 10);
					const progress =
						1 - (deadline - now) / DND_REORDER_DURATION_MS;

					const t = sineOut(Math.min(1, progress));
					setY(element, currentY + (targetY - currentY) * t);
				}

				targetY += gap + element.offsetHeight;
			}
		}

		function animate() {
			if (cancelled) return;
			tick();
			requestAnimationFrame(animate);
		}

		requestAnimationFrame(animate);

		return () => (cancelled = true);
	});
</script>

<div class="relative" bind:this={container}>
	{#each shadow as item (key(item))}
		<div data-key={key(item)} class="absolute top-0 left-0 right-0">
			{@render renderItem(item)}
		</div>
	{/each}
</div>
