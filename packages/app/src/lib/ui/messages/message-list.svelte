<script lang="ts">
    import type {MessageView} from '../../agent/view.svelte';
    import SystemMessage from './system-message.svelte';

    interface Props {
        messages: MessageView[];
    }

    const {messages}: Props = $props();
</script>

<div class="flex flex-col flex-1 relative">
    {#each messages as message (message.id)}
        {#if message.payload.type !== 'text'}
            <SystemMessage {message} />
        {/if}
    {/each}
</div>
