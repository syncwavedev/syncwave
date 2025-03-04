<script lang="ts">
	import TimesIcon from './icons/times-icon.svelte';

	interface Props {
		file: File;
		onRemove: () => void;
	}

	let {file, onRemove}: Props = $props();

	const url = $derived(URL.createObjectURL(file));
</script>

<img src={url} alt={file.name} class="h-16 w-16 rounded-md object-cover" />
<button type="button" class="btn--icon btn--icon--ink" onclick={onRemove}>
	<TimesIcon />
</button>
