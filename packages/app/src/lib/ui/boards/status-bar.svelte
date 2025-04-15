<script lang="ts">
    import {onMount} from 'svelte';
    let isOnline = navigator.onLine;

    function updateOnlineStatus() {
        isOnline = navigator.onLine;
    }

    onMount(() => {
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    });
</script>

<div class="flex items-center gap-2">
    <div
        class="w-2 h-2 rounded-full"
        class:bg-green-500={isOnline}
        class:bg-red-500={!isOnline}
        class:animate-pulse={isOnline}
    ></div>
    <span class="text-sm text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
    </span>
</div>
