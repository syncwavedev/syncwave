<script lang="ts">
    import type {Snippet} from 'svelte';

    interface Props {
        callback: (file: File) => void;
        children: Snippet;
        class?: string;
    }

    let {callback, children, class: className}: Props = $props();

    const handleFileChange = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
            callback(file);
        }
    };
</script>

<input
    type="file"
    id="file"
    class="hidden"
    onchange={handleFileChange}
    accept="image/*"
/>
<label for="file" class={className}>
    {@render children()}
</label>
