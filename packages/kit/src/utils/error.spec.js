import { assert, test } from 'vitest';
import { get_status, get_message } from './error.js';
import { HttpError, SvelteKitError } from '../exports/internal/index.js';

test('SvelteKitError.name is SvelteKitError', () => {
	assert.equal(new SvelteKitError(404, 'Not Found', 'not found').name, 'SvelteKitError');
});

test('get_status: HttpError', () => {
	assert.equal(get_status(new HttpError(404, 'Not found')), 404);
});

test('get_status: SvelteKitError (same bundle)', () => {
	assert.equal(get_status(new SvelteKitError(413, 'Payload Too Large', 'body too big')), 413);
});

test('get_status: SvelteKitError from a different bundle', () => {
	// Simulates the class identity mismatch when adapter-node and the kit runtime each bundle
	// their own copy of SvelteKitError (e.g. body-size-limit 413 thrown via adapter-node)
	const cross_bundle_error = Object.assign(new Error('body too big'), {
		name: 'SvelteKitError',
		status: 413,
		text: 'Payload Too Large'
	});
	assert.equal(get_status(cross_bundle_error), 413);
});

test('get_status: generic Error falls back to 500', () => {
	assert.equal(get_status(new Error('oops')), 500);
});

test('get_message: SvelteKitError (same bundle)', () => {
	assert.equal(get_message(new SvelteKitError(413, 'Payload Too Large', 'body too big')), 'Payload Too Large');
});

test('get_message: SvelteKitError from a different bundle', () => {
	const cross_bundle_error = Object.assign(new Error('body too big'), {
		name: 'SvelteKitError',
		status: 413,
		text: 'Payload Too Large'
	});
	assert.equal(get_message(cross_bundle_error), 'Payload Too Large');
});

test('get_message: generic Error falls back to Internal Error', () => {
	assert.equal(get_message(new Error('oops')), 'Internal Error');
});
