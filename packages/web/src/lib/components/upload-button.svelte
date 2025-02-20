<script lang="ts">
	export let callback: (data: Uint8Array, contentType: string) => void;

	let fileName: string = '';
	let fileContent: Uint8Array | null = null;

	const handleFileChange = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			fileName = file.name;
			const content = await file.arrayBuffer();
			fileContent = new Uint8Array(content);

			callback(fileContent, file.type || 'application/octet-stream');
		}
	};
</script>

<input
	type="file"
	id="file"
	style="display: none"
	on:change={handleFileChange}
/>
<label for="file" class="file-upload"> Choose File </label>
{#if fileName}
	<span class="file-name">{fileName}</span>
{/if}

<style>
	.file-upload {
		display: inline-block;
		padding: 10px 20px;
		background-color: #66cdaa;
		color: white;
		font-weight: bold;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.file-upload:hover {
		background-color: #57b293;
	}

	.file-name {
		margin-left: 10px;
		font-style: italic;
	}
</style>
