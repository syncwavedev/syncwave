<script lang="ts">
	let {
		name,
		class: className,
		title,
	}: {name: string; class?: string; title?: string} = $props();
</script>

<div
	title={title ?? name}
	class={`grid h-[1em] w-[1em] place-items-center rounded-full bg-[#3F6B7E] text-white ${className ?? ''}`}
>
	<div class="text-[0.45em] font-semibold">
		{name[0]?.toUpperCase() ?? 'U'}
	</div>
</div>
