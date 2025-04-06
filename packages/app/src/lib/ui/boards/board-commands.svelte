<script lang="ts">
    import type {Board} from 'syncwave';
    import CommandView from '../command-center/command-view.svelte';
    import EllipsisIcon from '../components/icons/ellipsis-icon.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import CommandCenterItem from '../command-center/command-center-item.svelte';
    import router from '../../router';
    import {commandCenter} from '../command-center/command-center-manager.svelte';

    const {
        boards,
    }: {
        boards: Board[];
    } = $props();
</script>

<CommandView>
    <div class="flex flex-col py-1 px-1">
        <CommandCenterItem icon={PlusIcon} label="New Board" />
        {#each boards as board (board.id)}
            <CommandCenterItem
                icon={HashtagIcon}
                label={board.name}
                onclick={() => {
                    commandCenter.close();
                    router.route(`/b/${board.key}`);
                }}
            />
        {/each}
    </div>
</CommandView>
