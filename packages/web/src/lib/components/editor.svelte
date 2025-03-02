<script lang="ts">
	import {onMount} from 'svelte';
	import cx from 'clsx';
	import {get, type Readable} from 'svelte/store';
	import {
		BubbleMenu,
		createEditor,
		Editor,
		EditorContent,
	} from 'svelte-tiptap';
	import StarterKit from '@tiptap/starter-kit';
	import {Collaboration} from '@tiptap/extension-collaboration';
	import Placeholder from '@tiptap/extension-placeholder';
	import {XmlFragment} from 'yjs';

	let editor = $state() as Readable<Editor>;

	interface Props {
		fragment: XmlFragment;
		placeholder: string;
	}

	let {fragment, placeholder}: Props = $props();

	onMount(() => {
		editor = createEditor({
			extensions: [
				StarterKit,
				Collaboration.configure({
					fragment,
				}),
				Placeholder.configure({
					placeholder,
				}),
			],
			content: '',
		});
	});
	const toggleBold = () => {
		get(editor).chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		get(editor).chain().focus().toggleItalic().run();
	};

	const isActive = (name: string, attrs = {}) =>
		get(editor).isActive(name, attrs);
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

<EditorContent class="min-h-[100px] outline-0" editor={$editor} />

<style>
	:global {
		.tiptap p.is-editor-empty:first-child::before {
			color: #adb5bd;
			content: attr(data-placeholder);
			float: left;
			height: 0;
			pointer-events: none;
		}
		.ProseMirror:focus {
			outline: none;
		}
	}
</style>
