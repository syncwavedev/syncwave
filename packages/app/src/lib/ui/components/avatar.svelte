<script lang="ts">
    let {
        name,
        class: className,
        title,
    }: {name: string; class?: string; title?: string} = $props();
</script>

<div
    title={title ?? name}
    class={`avatar shrink-0 grid place-items-center rounded-full bg-[#3F6B7E] text-white ${className ?? ''}`}
>
    <div class="font-semibold text-[calc(var(--avatar-size)*0.5)]">
        {name[0]?.toUpperCase() ?? 'U'}
    </div>
</div>
