<script lang="ts">
    import {onMount} from 'svelte';
    import Loading from '../lib/ui/components/loading.svelte';
    import router from '../lib/router';
    import {getAgent} from '../lib/agent/agent.svelte';

    const {
        code,
    }: {
        code: string;
    } = $props();

    const agent = getAgent();

    onMount(() => {
        agent
            .joinViaCode(code)
            .then(key => {
                router.route(`/b/${key}`, {replace: true});
            })
            .catch(() => {
                // TODO: display toast
                alert(
                    'Unable to join the board. The invitation code may be invalid or expired. Please check the code and try again.'
                );

                router.route('/');
            });
    });
</script>

<Loading />
