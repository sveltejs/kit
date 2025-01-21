import { assert, test } from 'vitest';
import { update_pkg } from './utils.js';

test('Inserts package at correct position (1)', () => {
	const result = update_pkg(
		`{
	"dependencies": {
		"a": "1",
		"z": "3",
		"c": "4"
	}
}`,
		[['b', '2', '', 'dependencies']]
	);

	assert.equal(
		result,
		`{
	"dependencies": {
		"a": "1",
		"b": "2",
		"z": "3",
		"c": "4"
	}
}`
	);
});

test('Inserts package at correct position (2)', () => {
	const result = update_pkg(
		`{
	"dependencies": {
		"a": "1",
		"b": "2"
	}
}`,
		[['c', '3', '', 'dependencies']]
	);

	assert.equal(
		result,
		`{
	"dependencies": {
		"a": "1",
		"b": "2",
		"c": "3"
	}
}`
	);
});

test('Inserts package at correct position (3)', () => {
	const result = update_pkg(
		`{
	"dependencies": {
		"b": "2",
		"c": "3"
	}
}`,
		[['a', '1', '', 'dependencies']]
	);

	assert.equal(
		result,
		`{
	"dependencies": {
		"a": "1",
		"b": "2",
		"c": "3"
	}
}`
	);
});

test('Does not downgrade versions', () => {
	const result = update_pkg(
		`{
	"devDependencies": {
		"@sveltejs/kit": "^2.4.3"
	}
}`,
		[['@sveltejs/kit', '^2.0.0']]
	);

	assert.equal(
		result,
		`{
	"devDependencies": {
		"@sveltejs/kit": "^2.4.3"
	}
}`
	);
});
