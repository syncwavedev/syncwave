<script lang="ts">
    import {toastManager} from '../../../toast-manager.svelte';
    import ErrorIcon from './icons/error-icon.svelte';
    import InfoIcon from './icons/info-icon.svelte';
    import WarnIcon from './icons/warn-icon.svelte';
</script>

<div class="toast-container">
    {#each toastManager.getToasts() as t (t.id)}
        <div class="toast">
            <span
                class="flex-shrink-0"
                class:text-ink-danger={t.level === 'error'}
                class:text-yellow-500={t.level === 'warning'}
            >
                {#if t.level === 'info'}
                    <InfoIcon />
                {:else if t.level === 'warning'}
                    <WarnIcon />
                {:else if t.level === 'error'}
                    <ErrorIcon />
                {/if}
            </span>
            <div class="flex flex-col gap-1">
                <div class="font-medium flex items-center gap-1">
                    {t.header}
                </div>
                <div class="text-ink-detail">
                    {t.caption}
                </div>
                <div class="-ml-1">
                    <button
                        class="btn--ghost hover:bg-material-elevated-hover"
                        onclick={() => toastManager.remove(t.id)}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 3rem;
        right: 1rem;

        display: flex;
        flex-direction: column;
        align-items: flex-end;

        gap: 0.5rem;

        z-index: 9999;

        max-width: 42ch;
        width: 100%;

        pointer-events: none;

        --icon-size: 1.4rem;
    }

    .toast {
        background: var(--color-material-elevated);

        border: 1px solid var(--color-divider-elevated);
        border-radius: var(--radius-lg);

        box-shadow: var(--shadow-sm);

        padding-block-start: 0.5rem;
        padding-block-end: 0.25rem; /* compensate actions  */
        padding-inline: 0.5rem;

        display: flex;

        width: 100%;

        gap: 0.5rem;
    }

    @keyframes toast-slide-in {
        from {
            transform: translateY(20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
</style>
