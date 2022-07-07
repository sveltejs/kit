import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { lowercase_keys, serialize_error } from './utils.js';

test('lowercase_keys', () => {
	assert.equal(lowercase_keys({ KEY: 'value' }), { key: 'value' });
	assert.equal(lowercase_keys({ Key: 'value' }), { key: 'value' });
	assert.equal(lowercase_keys({ UNDERSCORE_KEY: 'value' }), { underscore_key: 'value' });
	assert.equal(lowercase_keys({ 1: 'Hello World' }), { 1: 'Hello World' });
});

test('serialize_error', () => {
	class FancyError extends Error {
		name = 'FancyError';
		fancy = true;

		/**
		 * @param {string} message
		 * @param {{
		 *   cause?: Error
		 * }} [options]
		 */
		constructor(message, options) {
			// @ts-expect-error go home typescript ur drunk
			super(message, options);
		}
	}

	const error = new FancyError('something went wrong', {
		cause: new Error('sorry')
	});

	const serialized = serialize_error(error, (error) => error.stack);

	assert.equal(
		serialized,
		JSON.stringify({
			name: 'FancyError',
			message: 'something went wrong',
			stack: error.stack,
			cause: {
				name: 'Error',
				message: 'sorry',
				// @ts-expect-error
				stack: error.cause.stack
			},
			fancy: true
		})
	);
});

test.run();
