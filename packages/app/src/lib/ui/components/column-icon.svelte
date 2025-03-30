<script lang="ts">
	const {total, active}: {total: number; active: number} = $props();

	const center = {x: 12, y: 12};
	const circleRadius = 9;

	const getActiveColor = () => {
		if (active === total) return 'text-green-400';
		if (active > 0) return 'text-yellow-250';
		return 'dark:text-gray-600 text-gray-200';
	};
	const activeColorClass = getActiveColor();

	const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

	const gapAngle = 20;
	const initialRotation = -80;

	const segments = Array.from({length: total}, (_, i) => {
		const availableAngle = 360 - total * gapAngle;
		const segmentAngle = availableAngle / total;

		// Calculate start and end angles with gap consideration
		const startAngle = initialRotation + i * (segmentAngle + gapAngle);
		const endAngle = startAngle + segmentAngle;

		const startRad = degreesToRadians(startAngle);
		const endRad = degreesToRadians(endAngle);

		return {
			startX: center.x + circleRadius * Math.cos(startRad),
			startY: center.y + circleRadius * Math.sin(startRad),
			endX: center.x + circleRadius * Math.cos(endRad),
			endY: center.y + circleRadius * Math.sin(endRad),
		};
	});
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	class="icon {activeColorClass}"
>
	<title>{active} out of {total} active</title>

	<!-- Inner solid circle -->
	<circle
		cx={center.x}
		cy={center.y}
		r="6"
		fill="currentColor"
		class={activeColorClass}
	/>

	<!-- Rounded outer sections -->
	{#each segments as segment, i}
		{@const isActive = i < active}
		<path
			d="M {segment.startX} {segment.startY}
						A {circleRadius} {circleRadius} 0 0 1 {segment.endX} {segment.endY}"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			fill="none"
			class={isActive ? activeColorClass : 'dark:text-gray-600 text-gray-200'}
		/>
	{/each}
</svg>
