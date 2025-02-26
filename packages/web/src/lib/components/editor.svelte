<script lang="ts">
	import {onMount} from 'svelte';
	import cx from 'clsx';
	import type {Readable} from 'svelte/store';
	import {
		BubbleMenu,
		createEditor,
		Editor,
		EditorContent,
	} from 'svelte-tiptap';
	import StarterKit from '@tiptap/starter-kit';

	let editor = $state() as Readable<Editor>;

	onMount(() => {
		editor = createEditor({
			extensions: [StarterKit],
			content: `Hello world!`,
		});
	});
	const toggleBold = () => {
		$editor.chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		$editor.chain().focus().toggleItalic().run();
	};

	const isActive = (name: string, attrs = {}) =>
		$editor.isActive(name, attrs);
</script>

{#if editor}
	<BubbleMenu editor={$editor}>
		<div data-test-id="bubble-menu" class="flex">
			<button
				class={cx('bg-black px-2 text-white/90 hover:text-white', {
					'text-white!': isActive('bold'),
				})}
				type="button"
				onclick={toggleBold}
			>
				bold
			</button>
			<button
				class={cx('bg-black px-2 text-white/90 hover:text-white', {
					'text-white!': isActive('italic'),
				})}
				type="button"
				onclick={toggleItalic}
			>
				italic
			</button>
		</div>
	</BubbleMenu>
{/if}

<EditorContent editor={$editor} />
