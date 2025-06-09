<script lang="ts">
    import {assertNever} from 'syncwave';
    import {getAgent} from '../../agent/agent.svelte';
    import ChatBubbleSolidIcon from '../components/icons/chat-bubble-solid-icon.svelte';
    import SignalSolidIcon from '../components/icons/signal-solid-icon.svelte';
    import NoSignalSolidIcon from '../components/icons/no-signal-solid-icon.svelte';

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

<div class="flex items-center gap-4 text-sm icon-sm w-full">
    <div
        title={statusTitle}
        class="flex items-center gap-1.5"
        class:text-yellow-500={agent.status === 'unstable'}
        class:text-red-500={agent.status === 'offline'}
    >
        {#if agent.status === 'online' || agent.status === 'unstable'}
            <SignalSolidIcon />
            <span>Online</span>
        {/if}
        {#if agent.status === 'offline'}
            <NoSignalSolidIcon />
            <div
                title="Trying to reconnect to the server, hold on! This may take up to a minute."
            >
                Reconnecting{reconnectingDots}<span class="opacity-0"
                    >{reconnectingDotsPadding}</span
                >
            </div>
        {/if}
    </div>
    {#if agent.pingLatency && agent.status !== 'offline'}
        {@const pingLatency = Math.round(agent.pingLatency)}
        <div title="Ping to the server">
            Ping: ~{pingLatency}ms
        </div>
    {/if}
    <div class="ml-auto">
        <a
            href="https://discord.gg/FzQjQVFdQz"
            class="btn hover:bg-material-base-hover"
            target="_blank"
        >
            <ChatBubbleSolidIcon /> Leave Feedback
        </a>
    </div>
</div>
