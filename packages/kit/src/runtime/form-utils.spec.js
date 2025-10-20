import { describe, expect, test } from 'vitest';
import { convert_formdata, split_path } from './form-utils.js';

describe('split_path', () => {
	const good = [
		{
			input: 'foo',
			output: ['foo']
		},
		{
			input: 'foo.bar.baz',
			output: ['foo', 'bar', 'baz']
		},
		{
			input: 'foo[0][1][2]',
			output: ['foo', '0', '1', '2']
		}
	];

	const bad = ['[0]', 'foo.0', 'foo[bar]'];

	for (const { input, output } of good) {
		test(input, () => {
			expect(split_path(input)).toEqual(output);
		});
	}

	for (const input of bad) {
		test(input, () => {
			expect(() => split_path(input)).toThrowError(`Invalid path ${input}`);
		});
	}
});

describe('convert_formdata', () => {
	test('converts a FormData object', () => {
		const data = new FormData();

		data.append('foo', 'foo');

		data.append('object.nested.property', 'property');
		data.append('array[]', 'a');
		data.append('array[]', 'b');
		data.append('array[]', 'c');

		const converted = convert_formdata(data);

		expect(converted).toEqual({
			foo: 'foo',
			object: {
				nested: {
					property: 'property'
				}
			},
			array: ['a', 'b', 'c']
		});
	});

	test('handles multiple fields at the same nested level', () => {
		const data = new FormData();

		data.append('user.name.first', 'first');
		data.append('user.name.last', 'last');

		const converted = convert_formdata(data);

		expect(converted).toEqual({
			user: {
				name: {
					first: 'first',
					last: 'last'
				}
			}
		});
	});

	const pollution_attacks = [
		'__proto__.polluted',
		'constructor.polluted',
		'prototype.polluted',
		'user.__proto__.polluted',
		'user.constructor.polluted'
	];

	for (const attack of pollution_attacks) {
		test(`prevents prototype pollution: ${attack}`, () => {
			const data = new FormData();
			data.append(attack, 'bad');
			expect(() => convert_formdata(data)).toThrow(/Invalid key "/);
		});
	}
});
