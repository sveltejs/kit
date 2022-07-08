import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { webcrypto } from 'crypto';
import { sha256 } from './crypto.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
].slice(0);

inputs.forEach((input) => {
	test(input, async () => {
		// @ts-expect-error typescript what are you doing you lunatic
		const expected_bytes = await webcrypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode(input)
		);
		const expected = Buffer.from(expected_bytes).toString('base64');

		const actual = sha256(input);
		assert.equal(actual, expected);
	});
});

test.run();
