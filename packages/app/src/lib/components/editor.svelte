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
	import type {Awareness} from '../../../../data/dist/esm/src/awareness';

	let editor = $state() as Readable<Editor>;

	interface Props {
		fragment: XmlFragment;
		awareness: Awareness;
		placeholder: string;
		class?: string;
		onEnter?: () => void;
	}

	let {
		fragment,
		awareness,
		placeholder,
		class: className,
		onEnter,
	}: Props = $props();

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
		fragment.doc!.clientID = awareness.clientId;
		editor = createEditor({
			extensions: [
				...tiptapExtensions,
				Collaboration.configure({
					fragment,
				}),
				CollaborationCursor.configure({
					provider: {
						awareness,
					},
					user: {
						name: 'Cyndi Lauper',
						color: '#f783ac',
					},
				}),
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

		/* Basic editor styles */
		.tiptap {
			:first-child {
				margin-top: 0;
			}

			/* Placeholder (at the top) */
			p.is-editor-empty:first-child::before {
				color: var(--gray-4);
				content: attr(data-placeholder);
				float: left;
				height: 0;
				pointer-events: none;
			}

			p {
				word-break: break-all;
			}

			/* Give a remote user a caret */
			.collaboration-cursor__caret {
				border-left: 1px solid #0d0d0d;
				border-right: 1px solid #0d0d0d;
				margin-left: -1px;
				margin-right: -1px;
				pointer-events: none;
				position: relative;
				word-break: normal;
			}

			/* Render the username above the caret */
			.collaboration-cursor__label {
				border-radius: 3px 3px 3px 0;
				color: #0d0d0d;
				font-size: 12px;
				font-style: normal;
				font-weight: 600;
				left: -1px;
				line-height: normal;
				padding: 0.1rem 0.3rem;
				position: absolute;
				top: -1.4em;
				user-select: none;
				white-space: nowrap;
			}
		}
	}
</style>
