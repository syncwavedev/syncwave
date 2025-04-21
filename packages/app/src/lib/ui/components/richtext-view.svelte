<script lang="ts">
    import {XmlFragment} from 'yjs';
    import {yFragmentToHtml} from 'syncwave';

    interface Props {
        fragment: XmlFragment;
    }

    let {fragment}: Props = $props();
    let html = $state(yFragmentToHtml(fragment));
    $effect(() => {
        html = yFragmentToHtml(fragment);
        const observer = () => {
            html = yFragmentToHtml(fragment);
        };
        fragment.observeDeep(observer);

        return () => {
            fragment.unobserveDeep(observer);
        };
    });
</script>

<div class="tiptap">
    {@html html}
</div>

<style>
    :global {
        /* handle empty <p>, those represent black lines in prosemirror, browsers don't render empty <p> in view mode */
        p:empty::after {
            content: '\00A0';
        }
    }

    /* styles that apply to both editor.svelte and richtext-view.svelte must be added to tiptap.css */
</style>
