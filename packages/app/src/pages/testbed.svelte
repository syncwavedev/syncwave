<script lang="ts">
    import {getAgent} from '../lib/agent/agent.svelte';

    const agent = getAgent();
    agent
        .getKeyChildren({
            parent: ['some', 'key'],
            after: ['some', 'key', 'child#34'],
        })
        .then(keys => {
            console.log('Keys:', keys);
        });
</script>

Testbed
