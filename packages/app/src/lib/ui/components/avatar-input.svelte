<script lang="ts">
    import type {ObjectKey} from 'syncwave';
    import {getAgent, getObjectUrl} from '../../agent/agent.svelte';
    import Loader from './icons/loader.svelte';
    import MinusIcon from './icons/minus-icon.svelte';

    let {
        objectKey,
        onRemove,
        onChange,
    }: {
        objectKey: ObjectKey | undefined;
        onRemove: () => void;
        onChange: (value: ObjectKey) => void;
    } = $props();

    const agent = getAgent();

    let isLoading = $state<boolean>(false);

    function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target) {
            return;
        }

        const file = target.files?.[0];
        if (!file) {
            return;
        }

        isLoading = true;

        agent
            .uploadObject(file)
            .then(onChange)
            .finally(() => (isLoading = false));
    }
</script>

{#if !objectKey}
    <label class="input--avatar">
        <input type="file" accept="image/*" onchange={handleFileSelect} />
        <div class="input--avatar__icon relative overflow-hidden">
            {#if isLoading}
                <div class="animate-spin text-ink-detail">
                    <Loader />
                </div>
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="icon"
                >
                    <path
                        d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z"
                    />
                    <path
                        fill-rule="evenodd"
                        d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                        clip-rule="evenodd"
                    />
                </svg>
            {/if}
        </div>
    </label>
{:else}
    <div class="input--avatar">
        <img alt="avatar" src={getObjectUrl(objectKey, 'medium')} />
        <button
            class="btn btn--icon input--avatar__remove-btn bg-material-elevated-element"
            aria-label="Remove avatar"
            onclick={onRemove}
        >
            <MinusIcon />
        </button>
    </div>
{/if}
