<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';

    const agent = getAgent();
</script>

<div class="flex items-center gap-4 text-sm text-gray-600">
    <div class="flex items-center gap-2">
        <div
            class="w-2 h-2 rounded-full"
            class:bg-green-500={agent.status === 'online'}
            class:bg-red-500={agent.status === 'offline'}
            class:animate-pulse={agent.status === 'online'}
        ></div>
        <span>
            {#if agent.status === 'online'}
                Online
            {/if}
            {#if agent.status === 'offline'}
                Offline
            {/if}
        </span>
    </div>
    {#if agent.latency}
        <div>
            Latency: ~{Math.round(agent.latency)}ms
        </div>
    {/if}
</div>
