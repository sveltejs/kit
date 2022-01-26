import { test } from 'uvu';
import * as assert from 'uvu/assert';
import crypto from 'crypto';
import { sha256 } from './crypto.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
].slice(0);

inputs.forEach((input) => {
	test(input, () => {
		const expected_bytes = crypto.createHash('sha256').update(input, 'utf-8').digest();
		const expected = expected_bytes.toString('base64');

		const actual = sha256(input);
		assert.equal(actual, expected);
	});
});

test.run();
