import './polyfills';

import {mount} from 'svelte';
import App from './App.svelte.js.js';
import './app.css';

const app = mount(App, {
    target: document.getElementById('app')!,
});

export default app;
