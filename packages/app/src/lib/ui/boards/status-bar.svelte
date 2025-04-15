<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';

    const agent = getAgent();
</script>

<div class="flex items-center gap-4 text-xs text-ink-detail w-full h-9">
    <div class="flex items-center gap-1.5">
        <div
            class="w-2 h-2 rounded-full"
            class:bg-green-500={agent.status === 'online'}
            class:bg-red-500={agent.status === 'offline'}
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
    {#if agent.pingLatency}
        <div>
            Ping: ~{Math.round(agent.pingLatency)}ms
        </div>
    {/if}
</div>
