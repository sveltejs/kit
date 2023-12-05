import { assert, test } from 'vitest';
import { transform_code } from './migrate.js';

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
