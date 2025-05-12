<script lang="ts">
    import {getAgent, getObjectUrl} from '../lib/agent/agent.svelte';
    import UploadButton from '../lib/ui/components/upload-button.svelte';

    const agent = getAgent();
    agent.observeMeAsync().then(me => {
        console.debug('me', $state.snapshot(me.avatarUrl));
    });

    let fileUrl: string | undefined = $state(undefined);
</script>

<UploadButton
    callback={async file => {
        const objectKey = await agent.uploadObject(file);
        fileUrl = getObjectUrl(objectKey);
        agent.setMyAvatar(objectKey);
    }}
>
    Upload
</UploadButton>

{#if fileUrl}
    <img src={fileUrl} alt="Uploaded file" />
{/if}
