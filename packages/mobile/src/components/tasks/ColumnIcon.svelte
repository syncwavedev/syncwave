<script lang="ts">
	const {percentage}: {percentage?: number} = $props();
	let activeColor = $state('var(--color-subtle-3)');
	if (percentage !== undefined) {
		if (percentage == 100) {
			activeColor = 'var(--color-success)';
		} else if (percentage > 0) {
			activeColor = 'var(--color-pending)';
		}
	}

	// Calculate the end angle based on percentage (clockwise from 12 o'clock)
	const radius = 6;
	const centerX = 12;
	const centerY = 12;
	const percentage_normalized = (percentage ?? 0) / 100;
	const endAngle = percentage_normalized * 2 * Math.PI - Math.PI / 2; // Start from 12 o'clock (-90 degrees)
	const startAngle = -Math.PI / 2;

	// Calculate arc path
	const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
		// For 100%, draw a complete circle instead of an arc
		if (percentage === 100) {
			return `
				M ${centerX} ${centerY - radius}
				A ${radius} ${radius} 0 1 1 ${centerX - 0.001} ${centerY - radius}
				Z
			`;
		}

		const start = {
			x: centerX + radius * Math.cos(startAngle),
			y: centerY + radius * Math.sin(startAngle)
		};
		const end = {
			x: centerX + radius * Math.cos(endAngle),
			y: centerY + radius * Math.sin(endAngle)
		};

		// Determine if we need to draw more than 180 degrees
		const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

		// Create the arc path
		// M = Move to start point
		// A = Arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
		// L = Line to center
		// Z = Close path
		return `
			M ${start.x} ${start.y}
			A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
			L ${centerX} ${centerY}
			Z
		`;
	};

	const arcPath = createArcPath(startAngle, endAngle, radius);
</script>

<svg
	viewBox="0 0 24 24"
	width="24"
	height="24"
	fill="none"
	class="icon"
	xmlns="http://www.w3.org/2000/svg"
>
	<circle
		class="progress-track"
		cx="12"
		cy="12"
		r="10"
		stroke={activeColor}
		stroke-width="1.5"
		fill="none"
	/>
	<path class="progress-inner-fill" d={arcPath} fill={activeColor} />
</svg>
