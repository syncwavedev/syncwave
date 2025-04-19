<script lang="ts">
    import {assertNever} from 'syncwave';
    import {getAgent} from '../../agent/agent.svelte';
    import ChatBubbleOvalLeftIcon from '../components/icons/chat-bubble-oval-left-icon.svelte';

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

    let statusTitle = $derived.by(() => {
        if (agent.status === 'online') {
            return 'Connection is healthy';
        } else if (agent.status === 'unstable') {
            return 'Connection is unstable';
        } else if (agent.status === 'offline') {
            return 'Connection is lost, trying to reconnect...';
        } else {
            assertNever(agent.status);
        }
    });
</script>

<div class="flex items-center gap-4 text-xs icon-sm w-full">
    <div title={statusTitle} class="flex items-center gap-1.5">
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
        {@const pingLatency = Math.round(agent.pingLatency)}
        <div title={`Ping latency is ${pingLatency}ms`}>
            Ping: ~{pingLatency}ms
        </div>
    {/if}
    <a
        href="https://discord.gg/FzQjQVFdQz"
        class="ml-auto btn-ghost"
        target="_blank"
    >
        <ChatBubbleOvalLeftIcon /> Leave Feedback
    </a>
</div>
