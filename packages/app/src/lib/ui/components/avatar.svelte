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
        '#5a8ac8',
        '#b04a47',
        '#a88563',
        '#57979f',
        '#c06065',
        '#7fa064',
        '#8a7cb4',
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

    const idHash = getStringHash(userId);
    const avatarColor = avatarColors[idHash % avatarColors.length];
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
