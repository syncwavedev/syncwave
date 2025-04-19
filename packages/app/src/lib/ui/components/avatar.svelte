<script lang="ts">
    let {
        name,
        class: className,
        title,
    }: {name: string; class?: string; title?: string} = $props();

    const avatarColors = [
        '#74ade8', // blue
        '#be5046', // red
        '#bf956a', // beige
        '#b477cf', // purple
        '#6eb4bf', // teal
        '#d07277', // pink
        '#dec184', // yellow
        '#a1c181', // green
    ];

    function getStringHash(str: string): number {
        let hash = 0;
        if (str.length === 0) return hash;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }

        return Math.abs(hash);
    }

    const nameHash = getStringHash(name);
    const avatarColor = avatarColors[nameHash % avatarColors.length];
</script>

<div
    title={title ?? name}
    class={`avatar shrink-0 grid place-items-center rounded-full text-white ${className ?? ''}`}
    style={`background-color: ${avatarColor};`}
>
    <div
        class="font-bold text-[calc(var(--avatar-size)*0.55)] flex items-center justify-center h-full w-full"
    >
        {name[0]?.toUpperCase() ?? 'U'}
    </div>
</div>
