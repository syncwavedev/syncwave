<script lang="ts">
    import clsx from 'clsx';
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
        'oklch(65% 0.07 240deg)', // muted blue
        'oklch(60% 0.05 200deg)', // slate blue-grey
        'oklch(68% 0.03 270deg)', // soft lavender
        'oklch(58% 0.06 150deg)', // muted sage
        'oklch(57% 0.07 170deg)', // calm teal
        'oklch(50% 0.04 200deg)', // deep slate
        'oklch(62% 0.03 260deg)', // dusty lilac
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
    class={clsx(
        'avatar text-[calc(var(--avatar-size)*0.55)] text-white font-semibold',
        className
    )}
    style={`background-color: ${avatarColor};`}
>
    {name[0]?.toUpperCase() ?? 'U'}
</div>
