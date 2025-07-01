<script lang="ts">
    import {getAgent} from '../../agent/agent.svelte';
    import ArrowRightIcon from '../components/icons/arrow-right-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import TimesIcon from '../components/icons/times-icon.svelte';

    const {
        onBoardCreated,
    }: {
        onBoardCreated: (key: string) => void;
    } = $props();

    const agent = getAgent();

    let boardName = $state('');

    let emailInput = $state('');
    let inviteEmails = $state<string[]>([]);
    let isLoading = $state(false);

    function onInviteEmailSubmit(event: Event) {
        event.preventDefault();

        const email = emailInput.trim();
        if (email) {
            if (!inviteEmails.includes(email)) {
                inviteEmails.push(email);
            }

            emailInput = '';
        }
    }

    function onRemoveEmail(email: string) {
        inviteEmails = inviteEmails.filter(e => e !== email);
    }

    function onCreateBoard(event: Event) {
        event.preventDefault();

        const name = boardName.trim();
        if (name) {
            isLoading = true;
            agent
                .createBoard({
                    name,
                    memberEmails: inviteEmails,
                })
                .then(b => {
                    onBoardCreated(b.key);
                })
                .finally(() => {
                    isLoading = false;
                });
        }
    }
</script>

<div class="app">
    <div
        class="flex items-center shrink-0 px-panel-inline h-panel-header border-b border-divider w-full"
    >
        <p>{boardName || 'Untitled'}</p>
    </div>
    <div class="flex justify-center">
        <div
            class="
            flex
            flex-col
            mt-8
            text-lg
            min-w-lg
            "
        >
            <p>Enter a name for your board:</p>
            <input
                class="input mt-1"
                type="text"
                bind:value={boardName}
                placeholder="e.g. Marketing Sprint, Project Alpha"
                disabled={isLoading}
            />
            <p class="mt-4">Add team members (optional):</p>
            <form class="mt-1" onsubmit={onInviteEmailSubmit}>
                <fieldset class="flex items-center gap-1" disabled={isLoading}>
                    <input
                        class="input min-w-84 flex-1"
                        type="email"
                        bind:value={emailInput}
                        required
                        placeholder="e.g. john@company.com"
                    />
                    <button type="submit" class="btn btn--icon btn--bordered">
                        <PlusIcon />
                    </button>
                </fieldset>
            </form>
            <hr class="my-2" />
            {#if inviteEmails.length > 0}
                <ul>
                    {#each inviteEmails as email (email)}
                        <li
                            class="text-ink-body flex items-center justify-between gap-1"
                        >
                            {email}
                            <button
                                type="button"
                                class="btn btn--icon"
                                onclick={() => onRemoveEmail(email)}
                                disabled={isLoading}
                            >
                                <TimesIcon />
                            </button>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p class="text-ink-detail py-1 text-sm">
                    No team members added yet.
                </p>
            {/if}
            <div class="mt-6">
                <button
                    type="button"
                    class="btn btn--flat-elevated"
                    disabled={isLoading}
                    onclick={onCreateBoard}
                >
                    Create a new board <ArrowRightIcon />
                </button>
            </div>
        </div>
    </div>
</div>
