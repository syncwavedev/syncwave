<script lang="ts">
    import SpinnerIcon from '../../components/icons/spinner-icon.svelte';
    import TimesIcon from './icons/times-icon.svelte';

    interface Props {
        file: File;
        loading: boolean;
        onRemove: () => void;
    }

    let {file, loading, onRemove}: Props = $props();

    const url = $derived(URL.createObjectURL(file));
</script>

<div class="relative">
    <img src={url} alt={file.name} class="h-16 w-16 rounded-md object-cover" />
    <button
        type="button"
        class="btn--icon btn--icon--ink absolute top-0 right-0 !h-[1em] !w-[1em]"
        onclick={onRemove}
    >
        <TimesIcon />
    </button>
    {#if loading}
        <SpinnerIcon
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
    {/if}
</div>
