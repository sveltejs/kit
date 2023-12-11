import { assert, test } from 'vitest';
import {
	transform_code,
	update_svelte_config_content,
	update_tsconfig_content
} from './migrate.js';

test('Removes throws#1', () => {
	const result = transform_code(
		`import { redirect, error } from '@sveltejs/kit';
        
throw redirect();
redirect();
throw error();
error();
function x() {
	let redirect = true;
	throw redirect();
}`,
		false,
		''
	);
	assert.equal(
		result,

		`import { redirect, error } from '@sveltejs/kit';
        
redirect();
redirect();
error();
error();
function x() {
	let redirect = true;
	throw redirect();
}`
	);
});

test('Removes throws#2', () => {
	const result = transform_code(
		`import { redirect, error } from 'somewhere-else';
        
throw redirect();
redirect();
throw error();
error();`,
		false,
		''
	);
	assert.equal(
		result,

		`import { redirect, error } from 'somewhere-else';
        
throw redirect();
redirect();
throw error();
error();`
	);
});

test('Notes cookies#1', () => {
	const result = transform_code(
		`
export function load({ cookies }) {
	cookies.set('foo', 'bar');
}`,
		false,
		'+page.js'
	);
	assert.equal(
		result,

		`
export function load({ cookies }) {
	/* @migration task: add path argument */cookies.set('foo', 'bar');
}`
	);
});

test('Notes cookies#2', () => {
	const result = transform_code(
		`
export function load({ cookies }) {
	cookies.set('foo', 'bar', { path: '/' });
}`,
		false,
		'+page.js'
	);
	assert.equal(
		result,

		`
export function load({ cookies }) {
	cookies.set('foo', 'bar', { path: '/' });
}`
	);
});

test('Removes old tsconfig options#1', () => {
	const result = update_tsconfig_content(
		`{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}`
	);
	assert.equal(
		result,

		`{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
	}
}`
	);
});

test('Removes old tsconfig options#2', () => {
	const result = update_tsconfig_content(
		`{
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}`
	);
	assert.equal(
		result,
		`{
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}`
	);
});

test('Updates svelte.config.js', () => {
	const result = update_svelte_config_content(
		`export default {
			kit: {
				foo: bar,
				dangerZone: {
					trackServerFetches: true
				},
				baz: qux
		}`
	);
	assert.equal(
		result,
		`export default {
			kit: {
				foo: bar,
				baz: qux
		}`
	);
});
