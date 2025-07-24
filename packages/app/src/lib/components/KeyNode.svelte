<script lang="ts">
    import KeyNode from './KeyNode.svelte'; // Assuming recursive, svelte:self could also be used if preferred.
    import {
        Crdt,
        CrdtDiff,
        decodeMsgpack,
        decodeTuple,
        getReadableError, // Assuming this is used by your actual jsonValue logic if needed
        log,
        toError,
        type Tuple,
    } from 'syncwave'; // Assuming these are from your project's 'syncwave' module
    import {getAgent} from '../agent/agent.svelte';
    import {onMount} from 'svelte';

    interface Props {
        keyPath: Tuple;
    }

    let {keyPath}: Props = $props();

    const agent = getAgent(); // Get the agent instance

    let isOpen = $state(false);
    onMount(() => {
        if (keyPath.length === 0) {
            toggleOpen();
        }
    });
    let isLoading = $state(false);
    const keyName =
        keyPath.length === 0
            ? '<Root>'
            : keyPath[keyPath.length - 1] === null
              ? '<null>'
              : keyPath[keyPath.length - 1];
    let children: Tuple[] = $state([]);
    let value: Uint8Array | null = $state(null);

    // Filter related state
    let filterInputValue = $state('');
    let activeFilterKeyName: string | null = $state(null); // This will now be used as a 'prefix'
    let touchedPrefixFilter = $state(false); // Track if the prefix filter has been touched

    // User's existing derived logic for jsonValue
    let jsonValue = $derived.by(() => {
        if (value === null) return '<null>';

        let msgpackResult: unknown;
        let msgpackError: string = 'Not attempted or failed.';
        let tupleError: string = 'Not attempted or failed.';
        let crdtError: string = 'Not attempted or failed.';

        try {
            msgpackResult = decodeMsgpack(value);
            if (
                typeof msgpackResult === 'object' &&
                msgpackResult !== null &&
                typeof (msgpackResult as Record<string, unknown>).timestamp ===
                    'number' &&
                (msgpackResult as Record<string, unknown>).payload instanceof
                    Uint8Array
            ) {
                try {
                    return Crdt.load(
                        msgpackResult as CrdtDiff<unknown>
                    ).snapshot();
                } catch (error: unknown) {
                    crdtError = JSON.stringify(
                        toError(error).toJSON(),
                        null,
                        2
                    );
                }
            } else {
                return msgpackResult;
            }
        } catch (error: unknown) {
            msgpackError = JSON.stringify(toError(error).toJSON(), null, 2);
            try {
                const tupleResult = decodeTuple(value);
                return tupleResult;
            } catch (tupleCatchError: unknown) {
                tupleError = JSON.stringify(
                    toError(tupleCatchError).toJSON(),
                    null,
                    2
                );
            }
        }
        return `Invalid data (unable to decode):\n- Msgpack: ${msgpackError}\n- CRDT: ${crdtError}\n- Tuple: ${tupleError}`;
    });

    let errorFetchingChildren: string | null = $state(null);
    let lastFetchedKeyPath: Tuple | null = $state(null);
    let canLoadMore = $state(false);

    let hasChildren = $state(true);
    let isEverOpened = $state(false);

    async function fetchChildren(loadMoreMode = false) {
        if (isLoading) return;
        isLoading = true;
        errorFetchingChildren = null;
        if (!loadMoreMode) {
            isEverOpened = true;
        }

        try {
            const params: {parent: Tuple; after?: Tuple; prefix?: string} = {
                // Added prefix to params type
                parent: keyPath,
            };

            if (loadMoreMode && lastFetchedKeyPath) {
                params.after = lastFetchedKeyPath;
                // If a prefix filter is active, it should persist during pagination
                if (activeFilterKeyName) {
                    params.prefix = activeFilterKeyName;
                }
            } else if (!loadMoreMode && activeFilterKeyName) {
                // Applying a prefix filter for an initial fetch (not loading more)
                params.prefix = activeFilterKeyName;
                // 'after' is undefined here, starting the filtered list from the beginning
            }

            const {
                children: newChildren,
                hasMore,
                value: entryValue,
            } = await agent.getKeyChildren(params);

            if (!loadMoreMode) {
                value = entryValue ?? null;
            }

            if (loadMoreMode) {
                children = [...children, ...newChildren];
            } else {
                children = newChildren;
                if (newChildren.length > 0 || hasMore) {
                    hasChildren = true;
                } else {
                    hasChildren = false;
                }
            }

            if (newChildren.length > 0) {
                lastFetchedKeyPath = newChildren[newChildren.length - 1];
            }
            canLoadMore = hasMore;
        } catch (error: unknown) {
            log.error({
                msg: `Failed to fetch children for ${keyPath.join('/')}:`,
                error,
            });
            errorFetchingChildren = getReadableError(error);
            if (!loadMoreMode) {
                hasChildren = false;
            }
        } finally {
            isLoading = false;
        }
    }

    function toggleOpen() {
        isOpen = !isOpen;
        if (isOpen) {
            fetchChildren(false);
        }
    }

    function handleLoadMore() {
        if (canLoadMore && !isLoading) {
            fetchChildren(true);
        }
    }

    function handleFilterSubmit(e: Event) {
        e.preventDefault(); // don't remove it
        const trimmedFilter = filterInputValue.trim();
        activeFilterKeyName = trimmedFilter === '' ? null : trimmedFilter;
        touchedPrefixFilter = true; // Mark the filter as touched

        lastFetchedKeyPath = null;
        children = [];
        fetchChildren(false);
    }

    function clearFilterAndRefetch() {
        filterInputValue = '';
        activeFilterKeyName = null;
        lastFetchedKeyPath = null;
        children = [];
        fetchChildren(false);
    }
</script>

<div class="key-node my-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        onclick={toggleOpen}
        role="button"
        tabindex="0"
        class="flex items-center py-1 group hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-150 cursor-pointer"
    >
        <button
            aria-hidden="true"
            tabindex="-1"
            class="mr-1 w-7 h-7 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none rounded-full"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Collapse ' + keyName : 'Expand ' + keyName}
        >
            {#if isOpen}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-5 h-5 transform transition-transform duration-150"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clip-rule="evenodd"
                    />
                </svg>
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-5 h-5 transform transition-transform duration-150"
                >
                    <path
                        fill-rule="evenodd"
                        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                        clip-rule="evenodd"
                    />
                </svg>
            {/if}
        </button>

        <span
            class="key-name font-medium text-gray-800 dark:text-gray-200"
            title={keyPath.join('/')}
        >
            {keyName}
        </span>
    </div>

    {#if isOpen}
        <div class="border-l-1 border-gray-100 dark:border-gray-700">
            <div class="filter-controls ml-7 mt-1 mb-1.5">
                {#if children.length > 10 || activeFilterKeyName || touchedPrefixFilter}
                    <form
                        onsubmit={handleFilterSubmit}
                        class="flex items-center gap-1.5"
                    >
                        <input
                            type="text"
                            bind:value={filterInputValue}
                            placeholder="Filter by prefix..."
                            class="flex-grow p-1 text-xs border border-gray-300 dark:border-gray-500 rounded dark:bg-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            class="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Apply prefix filter"
                        >
                            Apply
                        </button>
                        {#if activeFilterKeyName !== null}
                            <button
                                type="button"
                                onclick={clearFilterAndRefetch}
                                class="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Clear filter"
                                aria-label="Clear prefix filter"
                            >
                                Clear
                            </button>
                        {/if}
                    </form>
                {/if}
                {#if activeFilterKeyName}
                    <p
                        class="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5"
                    >
                        Filtering by prefix: "{activeFilterKeyName}"{children.length ===
                            0 &&
                        !isLoading &&
                        !errorFetchingChildren
                            ? ' (no matches)'
                            : ''}.
                    </p>
                {/if}
            </div>

            {#if isEverOpened && !isLoading && value !== null}
                <div
                    class="node-value-display p-2 mt-2 ml-7 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm"
                >
                    <h4
                        class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                    >
                        Value (type: {typeof jsonValue}):
                    </h4>
                    <pre
                        class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(
                            jsonValue,
                            null,
                            2
                        )}</pre>
                </div>
            {/if}

            {#if errorFetchingChildren}
                <p class="text-sm text-red-500 dark:text-red-400 py-1 ml-2">
                    Error loading children: {errorFetchingChildren}
                </p>
            {/if}

            {#if hasChildren}
                <div class="children-container ml-3.5 mt-1">
                    {#if isLoading && children.length === 0 && isEverOpened}
                        <p
                            class="text-sm text-gray-500 dark:text-gray-400 py-1 italic ml-2"
                        >
                            Loading children...
                        </p>
                    {/if}

                    {#if !isLoading && children.length === 0 && isEverOpened && !errorFetchingChildren}
                        <p
                            class="text-sm text-gray-500 dark:text-gray-400 py-1 italic ml-2"
                        >
                            No children found{activeFilterKeyName
                                ? ` with prefix "${activeFilterKeyName}"`
                                : ''}.
                        </p>
                    {/if}

                    {#each children as child (child.join('/'))}
                        <KeyNode keyPath={child} />
                    {/each}

                    {#if isLoading && children.length > 0}
                        <p
                            class="text-sm text-gray-500 dark:text-gray-400 py-1 italic ml-2"
                        >
                            Loading more children...
                        </p>
                    {/if}

                    {#if canLoadMore && !isLoading}
                        <button
                            onclick={handleLoadMore}
                            class="mt-2 ml-2 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                        >
                            Load More
                        </button>
                    {/if}
                </div>
            {/if}
        </div>{/if}
</div>
