<script lang="ts">
	import {tiptapExtensions} from '../richtext';
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
	import type {Awareness} from 'syncwave';
	import {hashString, type UserId} from 'syncwave';

	let editor = $state() as Readable<Editor>;

	interface Props {
		fragment: XmlFragment;
		awareness?: Awareness;
		placeholder: string;
		me: {
			readonly id: UserId;
			readonly fullName: string;
		};
		class?: string;
		onEnter?: () => void;
	}

	export function focus() {
		get(editor).commands.focus();
	}

	let {
		fragment,
		awareness,
		placeholder,
		me,
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

	const colors = [
		'#958DF1',
		'#F98181',
		'#FBBC88',
		'#FAF594',
		'#70CFF8',
		'#94FADB',
		'#B9F18D',
		'#C3E2C2',
		'#EAECCC',
		'#AFC8AD',
		'#EEC759',
		'#9BB8CD',
		'#FF90BC',
		'#FFC0D9',
		'#DC8686',
		'#7ED7C1',
		'#F3EEEA',
		'#89B9AD',
		'#D0BFFF',
		'#FFF8C9',
		'#CBFFA9',
		'#9BABB8',
		'#E3F4F4',
	];

	export function clear() {
		get(editor).commands.clearContent();
	}

	onMount(() => {
		const extensions = [
			...tiptapExtensions,
			Collaboration.configure({
				fragment,
			}),
			Placeholder.configure({
				placeholder,
			}),
			...(onEnter ? [SendMessageExtension] : []),
		];
		if (awareness) {
			fragment.doc!.clientID = awareness.clientId;
			extensions.push(
				CollaborationCursor.configure({
					provider: {awareness},
					user: {
						name: me.fullName,
						color: colors[hashString(me.id) % colors.length],
					},
				})
			);
		}

		editor = createEditor({
			extensions,
			content: '',
		});
	});
	const toggleBold = () => {
		get(editor).chain().focus().toggleBold().run();
	};

	const toggleItalic = () => {
		get(editor).chain().focus().toggleItalic().run();
	};

	const toggleStrike = () => {
		get(editor).chain().focus().toggleStrike().run();
	};

	const isActive = (name: string, attrs = {}) =>
		get(editor).isActive(name, attrs);
</script>

<!-- eslint-disable-next-line svelte/require-store-reactive-access -->
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
			<button
				class={cx('bg-black px-2 text-white/90 hover:text-white', {
					'text-white!': isActive('strike'),
				})}
				type="button"
				onclick={toggleStrike}
			>
				strikethrough
			</button>
		</div>
	</BubbleMenu>
{/if}

<EditorContent class={`${className} outline-0`} editor={$editor} />

<style>
	:global {
		.tiptap p.is-editor-empty:first-child::before {
			color: var(--color-ink-placeholder);
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

			pre {
				background: var(--black);
				border-radius: 0.5rem;
				color: var(--white);
				font-family: 'JetBrainsMono', monospace;
				margin: 1.5rem 0;
				padding: 0.75rem 1rem;

				code {
					background: none;
					color: inherit;
					font-size: 0.8rem;
					padding: 0;
				}
			}

			/* list style */
			ul,
			ol {
				margin: 0;
				padding-left: 1.5rem; /* Adjust as needed */
				list-style-position: outside;

				li {
					list-style-position: outside;
				}

				li p {
					margin-top: 0.25em;
					margin-bottom: 0.25em;
				}
			}

			ul {
				list-style: disc;
			}

			ol {
				list-style: decimal;
			}

			/* Task list specific styles */
			ul[data-type='taskList'] {
				list-style: none;
				margin-left: 0;
				padding: 0;

				li {
					align-items: center;
					display: flex;

					> label {
						flex: 0 0 auto;
						align-items: center;
						margin-right: 0.5rem;
						user-select: none;
						vertical-align: middle;

						input[type='checkbox'] {
							margin-bottom: 10px;
						}
					}

					> div {
						flex: 1 1 auto;
					}
				}
			}

			/* Placeholder (at the top) */
			p.is-editor-empty:first-child::before {
				color: var(--color-ink-placeholder);
				content: attr(data-placeholder);
				float: left;
				height: 0;
				pointer-events: none;
			}

			p {
				word-break: normal;
			}

			a {
				color: var(--color-blue-500);
				text-decoration: underline;
				cursor: pointer;
			}

			/* Give a remote user a caret */
			.collaboration-cursor__caret {
				border-left: 1px solid #0d0d0d;
				border-right: 1px solid #0d0d0d;
				margin-left: -1px;
				margin-right: -1px;
				position: relative;
				word-break: normal;

				&:hover .collaboration-cursor__label {
					visibility: visible;
				}
			}

			/* Render the username above the caret */
			.collaboration-cursor__label {
				visibility: hidden;
				pointer-events: none;
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
				-webkit-user-select: none;
				white-space: nowrap;
				z-index: 100;
			}
		}
	}
</style>
