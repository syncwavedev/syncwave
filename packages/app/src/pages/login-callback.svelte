<script lang="ts">
	import {unimplemented} from 'syncwave';
	import router from '../lib/router';
	import {getAuthManager} from '../lib/utils';

	const urlParams = new URLSearchParams(window.location.search);
	const token = urlParams.get('token');
	const redirectUrl = urlParams.get('redirectUrl');

	if (token) {
		const store = getAuthManager();
		store.logIn(token);
	} else {
		// todo: add error message
		unimplemented();
	}

	window.location.href = redirectUrl || '/';
</script>
