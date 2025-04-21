<script module>
    declare module '@tiptap/core' {
        interface Commands<ReturnType> {
            syncwave: {
                toggleItalic: () => ReturnType;
                toggleStrike: () => ReturnType;
                toggleBold: () => ReturnType;
            };
        }
    }
</script>

<script lang="ts">
    import {tiptapExtensions} from 'syncwave';
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
    import {type AnyExtension} from '@tiptap/core';
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
        onKeyDown?: () => void;
        onBlur?: () => void;
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
        onKeyDown,
        onBlur,
    }: Props = $props();

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
        const extensions: AnyExtension[] = [
            ...tiptapExtensions,
            Collaboration.configure({
                fragment,
            }),
            Placeholder.configure({
                placeholder,
            }),
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
            editorProps: {
                handleKeyDown: (view, event) => {
                    if (onKeyDown) {
                        onKeyDown();
                    }

                    if (event.key === 'Enter' && !event.shiftKey) {
                        if (onEnter) {
                            onEnter();
                            return true;
                        }
                    }
                    return false;
                },
            },
            onBlur: () => {
                if (onBlur) {
                    onBlur();
                }
            },
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
    /* edit tiptap.css for styles to apply to richtext-view.svelte as well */
</style>
