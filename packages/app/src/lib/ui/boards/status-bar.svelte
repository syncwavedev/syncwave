<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import CircleHelp from '../components/icons/circle-help.svelte';

    const agent = getAgent();
</script>

<div class="flex items-center gap-4 text-sm text-gray-600 w-full">
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
    {#if agent.pingLatency}
        <div>
            Ping: ~{Math.round(agent.pingLatency)}ms
        </div>
    {/if}
    <div class="flex-1"></div>
    <div>
        <a
            href="https://www.syncwave.dev/docs"
            target="_blank"
            class="btn--icon text-ink-body cursor-auto"
        >
            <CircleHelp size={18} />
        </a>
    </div>
</div>
