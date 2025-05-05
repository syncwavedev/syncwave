<script lang="ts">
    import type {Snippet} from 'svelte';
    import type {MemberView} from '../../agent/view.svelte';
    import permissionManager from '../../../permission-manager';

    const {
        children,
        member,
    }: {
        children: Snippet;
        member: MemberView;
    } = $props();

    permissionManager.setMember(member);

    $effect(() => {
        permissionManager.setMember(member);
    });
</script>

{@render children()}
