<script lang="ts">
    import Dialog from '../dialog.svelte';
    import TimesIcon from '../icons/times-icon.svelte';
    import {getAgent} from '../../agent/agent.svelte';
    import type {MeView} from '../../agent/view.svelte';

    interface Props {
        open: boolean;
        onClose: () => void;
        me: MeView;
    }

    let {open, onClose, me}: Props = $props();
    const agent = getAgent();
</script>

<Dialog {open} {onClose}>
    <div class="mx-4 my-2 flex items-center">
        <span class="text-xs font-semibold">Profile</span>
        <button onclick={onClose} class="btn--icon ml-auto">
            <TimesIcon />
        </button>
    </div>
    <hr />
    <div class="mx-4 my-4 flex flex-col gap-1">
        <label for="name" class="text-xs">Full name</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input
            type="text"
            id="name"
            value={me.fullName}
            autofocus
            onkeydown={e => e.key === 'Enter' && onClose()}
            oninput={e =>
                agent.setProfileFullName(me.id, e.currentTarget.value)}
            class="input input--bordered text-xs"
            placeholder="Name"
        />
    </div>
</Dialog>
