import { describe, expect, test } from 'vitest';
import { form_values_equal } from './form-utils.js';

describe('form value equality', () => {
	test('compares arrays and nested objects structurally', () => {
		expect(
			form_values_equal({ values: [1, { enabled: true }] }, { values: [1, { enabled: true }] })
		).toBe(true);
		expect(form_values_equal({ values: [1, 2] }, { values: [1, 3] })).toBe(false);
	});

	test('compares File values by identity', () => {
		const file = new File(['content'], 'value.txt');
		expect(form_values_equal(file, file)).toBe(true);
		expect(form_values_equal(file, new File(['content'], 'value.txt'))).toBe(false);
	});
});
