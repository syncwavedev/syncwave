<script lang="ts">
	import {tiptapExtensions} from '$lib/richtext';
	import {onMount} from 'svelte';
	import cx from 'clsx';
	import {get, type Readable} from 'svelte/store';
	import {
		BubbleMenu,
		createEditor,
		Editor,
		EditorContent,
	} from 'svelte-tiptap';
	import {Collaboration} from '@tiptap/extension-collaboration';
	import {CollaborationCursor} from '@tiptap/extension-collaboration-cursor';
	import Placeholder from '@tiptap/extension-placeholder';
	import {XmlFragment} from 'yjs';
	import {Extension} from '@tiptap/core';

	let editor = $state() as Readable<Editor>;

	interface Props {
		fragment: XmlFragment;
		placeholder: string;
		class?: string;
		onEnter?: () => void;
	}

	let {fragment, placeholder, class: className, onEnter}: Props = $props();

	const SendMessageExtension = Extension.create({
		addKeyboardShortcuts() {
			return {
				Enter: () => {
					onEnter?.();
					return true;
				},
			};
		},
	});

	export function clear() {
		get(editor).commands.clearContent();
	}

	onMount(() => {
		editor = createEditor({
			extensions: [
				...tiptapExtensions,
				Collaboration.configure({
					fragment,
				}),
				// CollaborationCursor.configure({
				// 	provider,
				// 	user: {
				// 		name: 'Some Name',
				// 		color: '#f783ac',
				// 	},
				// }),
				Placeholder.configure({
					placeholder,
				}),
				...(onEnter ? [SendMessageExtension] : []),
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

<EditorContent class={`${className} outline-0`} editor={$editor} />

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
