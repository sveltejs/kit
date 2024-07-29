import { assert, test } from 'vitest';
import {
	transform_module_code,
	transform_svelte_code,
	update_pkg_json_content
} from './migrate.js';

test('Updates component creation #1', () => {
	const result = transform_module_code(
		`import App from './App.svelte'

const app = new App({
  target: document.getElementById('app')!
})

export default app`
	);
	assert.equal(
		result,
		`import App from './App.svelte'
import { mount } from "svelte";

const app = mount(App, {
  target: document.getElementById('app')!
})

export default app`
	);
});

test('Updates component creation #2', () => {
	const result = transform_module_code(
		`import App from './App.svelte'

new App({
  target: document.getElementById('app')!,
  hydrate: true
})`
	);
	assert.equal(
		result,
		`import App from './App.svelte'
import { hydrate } from "svelte";

hydrate(App, {
  target: document.getElementById('app')!
})`
	);
});

test('Update package.json', () => {
	const result = update_pkg_json_content(`{
	"name": "svelte-app",
	"version": "1.0.0",
	"devDependencies": {
		"svelte": "^4.0.0",
		"svelte-check": "^3.0.0",
		"svelte-preprocess": "^5.0.0"
	},
	"dependencies": {
		"@sveltejs/kit": "^2.0.0"
	}
}`);
	assert.equal(
		result,
		`{
	"name": "svelte-app",
	"version": "1.0.0",
	"devDependencies": {
		"svelte": "^5.0.0",
		"svelte-check": "^4.0.0",
		"svelte-preprocess": "^6.0.0"
	},
	"dependencies": {
		"@sveltejs/kit": "^2.5.18"
	}
}`
	);
});
