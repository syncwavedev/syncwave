<script>
    import {getAgent} from '../lib/agent/agent.svelte';
    import {getAuthManager} from '../lib/utils/utils';

    const agent = getAgent();
    const authManager = getAuthManager();

    let email = '';

    async function handleImpersonate() {
        if (email.trim()) {
            const {token} = await agent.impersonate({email});
            authManager.logIn(token);
        }
    }
</script>

<div class="h-screen overflow-scroll select-text">
    <div
        class="p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-md max-w-6xl mx-auto"
    >
        <h2
            class="text-xl font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
        >
            Impersonate User
        </h2>

        <div class="space-y-4">
            <div>
                <label for="email" class="block text-sm font-medium mb-2">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    placeholder="Enter email address"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button
                on:click={handleImpersonate}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                Impersonate
            </button>
        </div>
    </div>
</div>
