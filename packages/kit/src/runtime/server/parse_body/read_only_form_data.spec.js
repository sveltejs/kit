import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { read_only_form_data } from './read_only_form_data.js';

const { data, append } = read_only_form_data();
append('foo', '1'), append('foo', '2'), append('foo', '3');
append('bar', '2'), append('bar', '1');

test('ro-fd get returns first value', () => {
	assert.equal(data.get('foo'), '1');
	assert.equal(data.get('bar'), '2');
});

test('ro-fd getAll returns array', () => {
	assert.equal(data.getAll('foo'), ['1', '2', '3']);
	assert.equal(data.getAll('bar'), ['2', '1']);
});

test('ro-fd has returns boolean flag', () => {
	assert.equal(data.has('foo'), true);
	assert.equal(data.has('bar'), true);
	assert.equal(data.has('baz'), false);
});

test('ro-fd iterator yields all key-value pairs', () => {
	const values = [];
	for (const [key, val] of data) values.push({ key, val });

	assert.equal(values.length, 5);
	assert.equal(values[0], { key: 'foo', val: '1' });
	assert.equal(values[3], { key: 'bar', val: '2' });
});

test('ro-fd entries() yields all key-value pairs', () => {
	const values = [];
	for (const [key, val] of data.entries()) values.push({ key, val });

	assert.equal(values.length, 5);
	assert.equal(values[0], { key: 'foo', val: '1' });
	assert.equal(values[3], { key: 'bar', val: '2' });
});

test('ro-fd keys() yields all unique keys', () => {
	const values = [];
	for (const key of data.keys()) values.push(key);

	assert.equal(values.length, 2);
	assert.equal(values, ['foo', 'bar']);
});

test('ro-fd values() yields all nested values', () => {
	const values = [];
	for (const val of data.values()) values.push(val);

	assert.equal(values.length, 5);
	assert.equal(values, ['1', '2', '3', '2', '1']);
});

test.run();
