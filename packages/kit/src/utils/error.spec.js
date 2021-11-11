import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { coalesce_to_error } from './error.js';

test('coalesce_to_error', () => {
	assert.equal(new Error('something wrong'), coalesce_to_error(new Error('something wrong')));
	assert.equal(
		{ name: 'error', message: 'error' },
		coalesce_to_error({ name: 'error', message: 'error' })
	);
	assert.equal(
		new Error(`{"message":"unknown error"}`),
		coalesce_to_error({ message: 'unknown error' })
	);
});

test.run();
