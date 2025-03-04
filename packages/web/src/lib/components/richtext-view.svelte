<script lang="ts">
	import {XmlFragment} from 'yjs';
	import {yFragmentToHtml} from '$lib/utils';

	interface Props {
		fragment: XmlFragment;
	}

	let {fragment}: Props = $props();
	let html = $derived(yFragmentToHtml(fragment));
</script>

{@html html}
