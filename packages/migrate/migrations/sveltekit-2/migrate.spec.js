import { assert, test } from 'vitest';
import { transform_code, update_tsconfig_content } from './migrate.js';

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
}`
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
error();`
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
