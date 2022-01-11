import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { get_single_valued_header } from './http.js';

test('get_single_valued_header', () => {
	assert.equal('123', get_single_valued_header({ key: '123' }, 'key'));
	assert.equal('world', get_single_valued_header({ hello: 'world' }, 'hello'));
	assert.equal(undefined, get_single_valued_header({}, 'key'));
	assert.equal('a', get_single_valued_header({ name: ['a'] }, 'name'));
	assert.equal(undefined, get_single_valued_header({ name: ['a'] }, 'undefinedName'));
	assert.throws(() => get_single_valued_header({ name: ['a', 'b', 'c'] }, 'name'));
});

test.run();
