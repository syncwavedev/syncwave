<script lang="ts">
    import type {Timestamp} from 'syncwave';
    import {timeSince} from '../utils/time-ago';

    const {
        time,
    }: {
        time: Timestamp;
    } = $props();

    let timeAgo = $state(timeSince(time));

    $effect(() => {
        const interval = setInterval(() => {
            timeAgo = timeSince(time);
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    });
</script>

{timeAgo}
