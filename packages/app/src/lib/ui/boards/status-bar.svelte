<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';

    const agent = getAgent();

    const MAX_DOTS = 3;
    let reconnectingAnimationCounter = $state(0);
    $effect(() => {
        const intervalId = setInterval(() => {
            reconnectingAnimationCounter =
                (reconnectingAnimationCounter + 1) % (MAX_DOTS + 1);
        }, 300);

        return () => clearInterval(intervalId);
    });

    let reconnectingDots = $derived('.'.repeat(reconnectingAnimationCounter));
    let reconnectingDotsPadding = $derived(
        '.'.repeat(MAX_DOTS - reconnectingAnimationCounter)
    );
</script>

<div class="flex items-center gap-4 text-xs text-ink-detail w-full h-9">
    <div class="flex items-center gap-1.5">
        {#if agent.status === 'online'}
            <div class="w-2 h-2 rounded-full bg-green-500"></div>

            <div>Online</div>
        {/if}
        {#if agent.status === 'unstable'}
            <div class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>

            <div>Online</div>
        {/if}
        {#if agent.status === 'offline'}
            <div class="w-2 h-2 relative">
                <div
                    class="absolute inset-0 w-2 h-2 rounded-full animate-ping bg-red-500"
                ></div>
                <div
                    class="absolute inset-0 w-2 h-2 rounded-full bg-red-500"
                ></div>
            </div>
            <div
                title="Trying to reconnect to the server, hold on! This may take up to a minute."
            >
                Reconnecting{reconnectingDots}<span class="opacity-0"
                    >{reconnectingDotsPadding}</span
                >
            </div>
        {/if}
    </div>
    {#if agent.pingLatency}
        <div>
            Ping: ~{Math.round(agent.pingLatency)}ms
        </div>
    {/if}
</div>
