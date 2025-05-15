<script lang="ts">
    import {onMount} from 'svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import {getReadableError, log, Tuple} from 'syncwave';
    import KeyNode from './key-node.svelte';
    // Adjust the import path to your actual agent file/module

    let rootNodes: Tuple[] = $state([]);
    let isLoadingRoots = $state(false);
    let rootError: string | null = $state(null);
    let lastRootFetchedKeyPath: Tuple | null = $state(null);
    let canLoadMoreRoots = $state(false);

    const agent = getAgent();

    async function fetchRootNodes(loadMoreMode = false) {
        if (isLoadingRoots) return;
        isLoadingRoots = true;
        rootError = null;

        try {
            const params: {parent: Tuple; after?: Tuple} = {
                parent: [], // Empty array for root keys
            };
            if (loadMoreMode && lastRootFetchedKeyPath) {
                params.after = lastRootFetchedKeyPath;
            }

            const {children: newRoots, hasMore} =
                await agent.getKeyChildren(params);

            if (loadMoreMode) {
                rootNodes = [...rootNodes, ...newRoots];
            } else {
                rootNodes = newRoots;
            }

            if (newRoots.length > 0) {
                lastRootFetchedKeyPath = newRoots[newRoots.length - 1];
            }
            canLoadMoreRoots = hasMore;
        } catch (error: unknown) {
            rootError = getReadableError(error);
            log.error({msg: 'Failed to fetch root keys', error});
        } finally {
            isLoadingRoots = false;
        }
    }

    onMount(() => {
        fetchRootNodes(false);
    });

    function handleLoadMoreRoots() {
        if (canLoadMoreRoots && !isLoadingRoots) {
            fetchRootNodes(true);
        }
    }
</script>

<div
    class="key-tree-view p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-md max-w-2xl mx-auto"
>
    <h2
        class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
    >
        Key Space Explorer
    </h2>

    {#if isLoadingRoots && rootNodes.length === 0}
        <p class="text-gray-600 dark:text-gray-400 italic p-2">
            Loading root keys...
        </p>
    {/if}

    {#if rootError}
        <p
            class="text-red-600 dark:text-red-400 p-2 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"
        >
            <strong>Error:</strong>
            {rootError}
        </p>
    {/if}

    {#if rootNodes.length > 0}
        {#each rootNodes as node (node.join('/'))}
            <KeyNode keyPath={node} />
        {/each}
    {:else if !isLoadingRoots && !rootError}
        <p class="text-gray-600 dark:text-gray-400 italic p-2">
            No keys found at the root.
        </p>
    {/if}

    {#if isLoadingRoots && rootNodes.length > 0}
        <p class="text-gray-600 dark:text-gray-400 italic mt-3 p-2">
            Loading more root keys...
        </p>
    {/if}

    {#if canLoadMoreRoots && !isLoadingRoots}
        <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
                onclick={handleLoadMoreRoots}
                class="w-full px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-colors duration-150"
            >
                Load More Root Keys
            </button>
        </div>
    {/if}
</div>
