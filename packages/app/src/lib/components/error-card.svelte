<script lang="ts">
    import {log} from 'syncwave';

    interface Props {
        error: unknown;
        reset?: () => void;
    }

    let {error, reset}: Props = $props();

    const errorConfig = {
        default: {
            emoji: '😅',
            title: 'Oops!',
            message:
                "Something unexpected happened on our end.<br>Don't worry, our team has been notified and we're working on it!",
        },
    };

    $effect(() => {
        log.error({error, msg: `Error occurred in web app`});
    });

    const currentTime = new Date().toLocaleString();
</script>

<div class="error-container">
    <div class="emoji">{errorConfig.default.emoji}</div>
    <h2>{errorConfig.default.title}</h2>
    <p class="message">
        {@html errorConfig.default.message}
    </p>
    <div class="error-details">
        <p class="error-meta">
            <span class="meta-label">Time:</span>
            {currentTime}<br />
            <span class="meta-label">Error ID:</span>
            {appError.id}
        </p>
    </div>
    <div class="flex gap-2">
        {#if reset}
            <button onclick={reset} class="button">Try Again</button>
        {/if}
        <button onclick={() => window.location.reload()} class="button"
            >Reload page</button
        >
    </div>
</div>

<style>
    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
        border-radius: 8px;
    }

    h2 {
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
        color: #495057;
    }

    .message {
        font-size: 1rem;
        line-height: 1.5;
        margin-bottom: 1rem;
        color: #6c757d;
    }

    .emoji {
        font-size: 3rem;
        margin-bottom: 0.5rem;
    }

    .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #339af0;
        color: white;
        text-decoration: none;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 1rem;
    }

    .button:hover {
        background-color: #228be6;
    }

    .error-details {
        padding: 0.75rem;
        margin: 0.5rem 0;
        background-color: #f1f3f5;
        border-radius: 4px;
        width: 100%;
        max-width: 500px;
        overflow-x: auto;
    }

    .error-meta {
        font-size: 0.8rem;
        font-family: monospace;
        color: #495057;
        text-align: left;
    }

    .meta-label {
        font-weight: bold;
        color: #495057;
    }
</style>
