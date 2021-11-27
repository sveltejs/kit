import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { lowercase_keys } from './utils.js';

test('lowercase_keys', () => {
	assert.equal(lowercase_keys({ KEY: 'value' }), { key: 'value' });
	assert.equal(lowercase_keys({ Key: 'value' }), { key: 'value' });
	assert.equal(lowercase_keys({ UNDERSCORE_KEY: 'value' }), { underscore_key: 'value' });
	assert.equal(lowercase_keys({ 1: 'Hello World' }), { 1: 'Hello World' });
});

test.run();
