<script lang="ts">
    const {total, active}: {total: number; active: number} = $props();

    const center = {x: 12, y: 12};
    const circleRadius = 9;
    const innerRadius = 6;

    const getActiveColor = () => {
        if (active === total) return 'text-green-400';
        if (active > 0) return 'text-blue-450';
        return 'dark:text-gray-600 text-gray-200';
    };
    const activeColorClass = getActiveColor();

    const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);

    // Calculate progress percentage
    const progressPercentage = $derived(total > 0 ? active / total : 0);

    // Calculate the arc for the progress indicator
    const startAngle = -90; // Start from top
    const endAngle = $derived(startAngle + progressPercentage * 360);

    // SVG arc path calculation for filled arc
    const createFilledArcPath = (
        radius: number,
        startAngle: number,
        endAngle: number
    ) => {
        // If we have a complete circle (360 degrees), use a different approach
        if (Math.abs(endAngle - startAngle) >= 360) {
            return `M ${center.x} ${center.y - radius}
																A ${radius} ${radius} 0 1 1 ${center.x - 0.001} ${center.y - radius}
																Z`;
        }

        const start = {
            x: center.x + radius * Math.cos(degreesToRadians(startAngle)),
            y: center.y + radius * Math.sin(degreesToRadians(startAngle)),
        };

        const end = {
            x: center.x + radius * Math.cos(degreesToRadians(endAngle)),
            y: center.y + radius * Math.sin(degreesToRadians(endAngle)),
        };

        // Large arc flag is 1 if angle > 180 degrees
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

        // We return to center to create a filled sector
        return `M ${center.x} ${center.y}
																L ${start.x} ${start.y}
																A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
																Z`;
    };

    // Generate filled arc path for progress indicator
    const progressFilledArcPath = $derived(
        createFilledArcPath(innerRadius, startAngle, endAngle)
    );
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    class="icon {activeColorClass}"
>
    <title>{active} out of {total} active</title>

    <!-- Background circle -->
    <circle
        cx={center.x}
        cy={center.y}
        r={circleRadius}
        stroke="currentColor"
        stroke-width="1.75"
        fill="none"
        class="dark:text-gray-600 text-gray-200"
    />

    <!-- Just the outer circle with no progress -->
    <circle
        cx={center.x}
        cy={center.y}
        r={circleRadius}
        stroke="currentColor"
        stroke-width="1.75"
        fill="none"
        class={activeColorClass}
    />

    <!-- Filled progress arc inside -->
    {#if progressPercentage > 0}
        <path
            d={progressFilledArcPath}
            fill="currentColor"
            class={activeColorClass}
        />
    {/if}
</svg>
