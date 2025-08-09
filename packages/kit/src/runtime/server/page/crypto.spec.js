import { webcrypto } from 'node:crypto';
import { assert, test } from 'vitest';
import { sha256 } from './crypto.js';
import { text_encoder } from '../../utils.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
];

inputs.forEach((input) => {
	test(input, async () => {
		const expected_bytes = await webcrypto.subtle.digest('SHA-256', text_encoder.encode(input));
		const expected = Buffer.from(expected_bytes).toString('base64');

		const actual = sha256(input);
		assert.equal(actual, expected);
	});
});
