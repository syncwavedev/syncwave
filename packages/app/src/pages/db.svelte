<script>
    import KeyNode from '../lib/ui/components/key-node.svelte';
</script>

<div class="h-screen overflow-scroll select-text">
    <div
        class="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-md max-w-6xl mx-auto"
    >
        <h2
            class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
        >
            DB Explorer
        </h2>

        <KeyNode keyPath={[]} />
    </div>
</div>
