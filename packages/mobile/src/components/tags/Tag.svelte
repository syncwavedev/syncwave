<script lang="ts">
</script>

<div class="tag">
	<span class="emoji">💬</span>
	<span class="tag-triangle"></span>
</div>

<style>
	.tag {
		display: inline-flex;
		align-items: center;
		background: var(--color-subtle-2);
		border-radius: 4px;
		padding: 2px 8px;
		position: relative;
		height: 1.2em;
		width: 2em;
	}

	.emoji {
		font-size: 0.6em;
	}

	.tag-triangle {
		position: absolute;
		right: -6px;
		top: 0;
		width: 0;
		height: 0;
		border-top: 0.6em solid transparent;
		border-bottom: 0.6em solid transparent;
		border-left: 6px solid var(--color-subtle-2);
	}
</style>
