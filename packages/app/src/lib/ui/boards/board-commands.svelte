<script lang="ts">
    import type {Board} from 'syncwave';
    import CommandView from '../command-center/command-view.svelte';
    import HashtagIcon from '../components/icons/hashtag-icon.svelte';
    import PlusIcon from '../components/icons/plus-icon.svelte';
    import CommandCenterItem from '../command-center/command-center-item.svelte';
    import router from '../../router';
    import modalManager from '../modal-manager.svelte';
    import CommandHeader from '../command-center/command-header.svelte';
    import AddBoardModal from './add-board-modal.svelte';
    const {
        boards,
    }: {
        boards: Board[];
    } = $props();

    let filter = $state('');

    let inputs = $derived([
        {
            id: 'new-board',
            icon: PlusIcon,
            label: 'New Board',
            onclick: () => {
                modalManager.navigate(newBoard, true);
            },
        },
        ...boards.map(x => ({
            id: x.id,
            icon: HashtagIcon,
            label: x.name,
            onclick: () => {
                modalManager.close();
                router.route(`/b/${x.key}`);
            },
        })),
    ]);

    let filtered = $derived(
        inputs.filter(x => x.label.toLowerCase().includes(filter.toLowerCase()))
    );
</script>

{#snippet newBoard()}
    <AddBoardModal />
{/snippet}

<CommandView>
    <CommandHeader placeholder="Search boards..." bind:filter />
    <div class="flex flex-col py-1 px-1">
        {#each filtered as item (item.id)}
            <CommandCenterItem
                icon={item.icon}
                label={item.label}
                onclick={item.onclick}
            />
        {:else}
            <p class="text-ink-detail my-2 ml-3">No matches</p>
        {/each}
    </div>
</CommandView>
