<script lang="ts">
    import type {UserId} from 'syncwave';

    let {
        name,
        class: className,
        title,
        userId,
    }: {
        userId: UserId;
        name: string;
        class?: string;
        title?: string;
    } = $props();

    const avatarColors = [
        'oklch(60% 0.115 255deg)',
        'oklch(60% 0.11 151deg)',
        'oklch(60% 0.10 270deg)',
        'oklch(60% 0.12 200deg)',
        'oklch(60% 0.12 180deg)',
        'oklch(60% 0.12 290deg)',
        'oklch(60% 0.12 240deg)',
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

    const idHash = $derived(getStringHash(userId));
    const avatarColor = $derived(avatarColors[idHash % avatarColors.length]);
</script>

<div
    title={title ?? name}
    class={`avatar shrink-0 grid place-items-center rounded-full text-white ${className ?? ''}`}
    style={`background-color: ${avatarColor};`}
>
    <div
        class="font-semibold text-[calc(var(--avatar-size)*0.55)] flex items-center justify-center h-full w-full"
    >
        {name[0]?.toUpperCase() ?? 'U'}
    </div>
</div>
