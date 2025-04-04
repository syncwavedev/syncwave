import '@webfill/async-context';

import './instrumentation.js';

import './lib/ui/styles/main.css';

import {mount} from 'svelte';
import App from './App.svelte';
import './lib/ui/styles/main.css';

const app = mount(App, {
    target: document.getElementById('app')!,
});

export default app;
