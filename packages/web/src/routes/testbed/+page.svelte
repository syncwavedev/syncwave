<script lang="ts">
	import UploadButton from '$lib/components/upload-button.svelte';
	import {getAuthManager, getSdk} from '$lib/utils';
	import {decodeBase64} from '../../../../data/dist/esm/src/base64';

	const sdk = getSdk();
	const userId = getAuthManager().getIdentityInfo()?.userId!;
</script>

<div class="flex flex-col gap-4">testbed</div>

<UploadButton
	callback={(buf, type) => {
		sdk(x =>
			x.setUserAvatar({
				userId: userId!,
				avatar: decodeBase64(buf),
				contentType: 'image/jpeg',
			})
		);
	}}
/>
