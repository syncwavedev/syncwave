<script lang="ts">
    import KeyNode from './key-node.svelte'; // Assuming recursive, svelte:self could also be used if preferred.
    import {
        Crdt,
        CrdtDiff,
        decodeMsgpack,
        decodeTuple,
        log,
        toError,
        type Tuple,
    } from 'syncwave'; // Assuming these are from your project's 'syncwave' module
    import {getAgent} from '../../agent/agent.svelte';

    interface Props {
        keyPath: Tuple;
    }

    let {keyPath}: Props = $props();

    const agent = getAgent(); // Get the agent instance

    let isOpen = $state(false);
    let isLoading = $state(false);
    const keyName = keyPath.at(-1)?.toString() ?? '<Root>';
    let children: Tuple[] = $state([]);
    let value: Uint8Array | null = $state(null);

    // User's existing derived logic for jsonValue
    let jsonValue = $derived.by(() => {
        if (value === null) return '<null>';

        let msgpackError: string = 'No error';
        let tupleError: string = 'No error';
        let result: unknown;
        try {
            // Attempt to decode as generic Msgpack
            result = decodeMsgpack(value);
        } catch (error: unknown) {
            msgpackError = JSON.stringify(toError(error).toJSON(), null, 2);

            try {
                result = decodeTuple(value);
            } catch (error: unknown) {
                tupleError = JSON.stringify(toError(error).toJSON(), null, 2);
            }
        }

        let crdtError: string = 'No error';
        if (
            typeof result === 'object' &&
            typeof (result as Record<string, unknown>).timestamp === 'number' &&
            (result as Record<string, unknown>).payload instanceof Uint8Array
        ) {
            // If Msgpack decoding failed, try to load as CRDT
            // (Note: If decodeMsgpack succeeded, this part is skipped due to the return statement above)
            try {
                return Crdt.load(result as CrdtDiff<unknown>).snapshot();
            } catch (error: unknown) {
                crdtError = JSON.stringify(toError(error).toJSON(), null, 2);
            }
        } else {
            return result;
        }

        return `Invalid data (unable to decode as Msgpack or CRDT):\n- Msgpack decoding attempt: ${msgpackError}\n- CRDT loading attempt: ${crdtError}\n- Tuple decoding attempt: ${tupleError}`;
    });

    let errorFetchingChildren: string | null = $state(null); // Renamed for clarity
    let lastFetchedKeyPath: Tuple | null = $state(null);
    let canLoadMore = $state(false);

    let hasChildren = $state(true); // Initially assume it might have children
    let isEverOpened = $state(false);

    async function fetchChildren(loadMoreMode = false) {
        if (isLoading) return;
        isLoading = true;
        errorFetchingChildren = null; // Clear previous child-fetching errors
        if (!loadMoreMode) {
            isEverOpened = true;
        }

        try {
            const params: {parent: Tuple; after?: Tuple} = {
                parent: keyPath,
            };
            if (loadMoreMode && lastFetchedKeyPath) {
                params.after = lastFetchedKeyPath;
            }

            const {
                children: newChildren,
                hasMore, // API indicates if more children can be paginated
                value: entryValue, // Value of the current keyPath
            } = await agent.getKeyChildren(params);

            // Value is typically fetched/updated on the initial load of a node, not on "load more" for children.
            if (!loadMoreMode) {
                value = entryValue ?? null;
            }

            if (loadMoreMode) {
                children = [...children, ...newChildren];
            } else {
                // Initial fetch for this node
                children = newChildren;
                // Update 'hasChildren' status based on the first fetch results
                if (newChildren.length > 0 || hasMore) {
                    hasChildren = true;
                } else {
                    hasChildren = false; // No children in first batch and no more pages indicated
                }
            }

            if (newChildren.length > 0) {
                lastFetchedKeyPath = newChildren[newChildren.length - 1];
            }
            canLoadMore = hasMore; // 'hasMore' from API directly determines if "Load More" for children is shown
        } catch (fetchError: unknown) {
            const err = toError(fetchError);
            log.error({
                msg: `Failed to fetch children for ${keyPath.join('/')}:`,
                error: err.toJSON(), // Log structured error
            });
            errorFetchingChildren = err.message; // Store user-facing error message
            if (!loadMoreMode) {
                hasChildren = false; // If initial fetch fails, assume no children for UI
            }
        } finally {
            isLoading = false;
        }
    }

    function toggleOpen() {
        isOpen = !isOpen;
        // Fetch children (and value) only if opening for the first time
        if (isOpen) {
            fetchChildren(false);
        }
    }

    function handleLoadMore() {
        if (canLoadMore && !isLoading) {
            fetchChildren(true); // True for loadMoreMode
        }
    }
</script>

<div class="key-node my-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        onclick={toggleOpen}
        role="button"
        tabindex="0"
        class="flex items-center py-1 group hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-150"
    >
        <button
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
            class="key-name font-medium text-gray-800 dark:text-gray-200 cursor-default"
            title={keyPath.join('/')}
        >
            {keyName || (keyPath.length === 0 ? '(Root)' : '(Unnamed Key)')}
        </span>
    </div>

    {#if isOpen}
        {#if isEverOpened && !isLoading && value !== null}
            <div
                class="node-value-display p-2 mt-2 ml-7 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm"
            >
                <h4
                    class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"
                >
                    Value ({typeof jsonValue}):
                </h4>
                <pre
                    class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{JSON.stringify(
                        jsonValue,
                        null,
                        2
                    )}</pre>
            </div>
        {/if}
        {#if hasChildren}
            <div
                class="children-container pl-5 border-l-2 border-gray-200 dark:border-gray-600 ml-3.5 mt-1"
            >
                {#if isLoading && children.length === 0 && isEverOpened}
                    <p
                        class="text-sm text-gray-500 dark:text-gray-400 py-1 italic ml-2"
                    >
                        Loading children...
                    </p>
                {/if}

                {#if errorFetchingChildren}
                    <p class="text-sm text-red-500 dark:text-red-400 py-1 ml-2">
                        Error loading children: {errorFetchingChildren}
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
    {/if}
</div>
