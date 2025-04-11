<script lang="ts">
    import cx from 'clsx';

    interface Props {
        class?: string;
    }

    let {class: className}: Props = $props();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cx('icon', className)}
    ><circle cx="12" cy="9" r="1" /><circle cx="19" cy="9" r="1" /><circle
        cx="5"
        cy="9"
        r="1"
    /><circle cx="12" cy="15" r="1" /><circle cx="19" cy="15" r="1" /><circle
        cx="5"
        cy="15"
        r="1"
    /></svg
>
