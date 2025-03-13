<script lang="ts">
	let {name}: {name: string} = $props();
</script>

<div
	class="grid h-[1em] w-[1em] place-items-center rounded-full bg-[#3F6B7E] text-white"
>
	<div class="text-[0.45em] font-semibold">{name[0]?.toUpperCase() ?? 'U'}</div>
</div>
