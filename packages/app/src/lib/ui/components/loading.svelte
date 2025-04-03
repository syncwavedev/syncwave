<script>
    import Loader from './icons/loader.svelte';
    import {onMount} from 'svelte';

    let showLoader = false;

    onMount(() => {
        const timer = setTimeout(() => {
            showLoader = true;
        }, 500);

        return () => clearTimeout(timer);
    });
</script>

{#if showLoader}
    <div class="flex h-screen w-screen items-center justify-center">
        <p class="text-ink-detail flex items-center">
            <span>Synchronizing your data with this device</span>
            <span class="ml-2 animate-spin"><Loader /></span>
        </p>
    </div>
{/if}
