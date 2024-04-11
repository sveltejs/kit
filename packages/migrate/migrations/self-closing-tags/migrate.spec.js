import { assert, test } from 'vitest';
import { remove_self_closing_tags } from './migrate.js';

/** @type {Record<string, string>} */
const tests = {
	'<div/>': '<div></div>',
	'<div />': '<div></div>',
	'<div class="foo"/>': '<div class="foo"></div>',
	'<div class="foo" />': '<div class="foo"></div>',
	'\t<div\n\t\tonclick={blah}\n\t/>': '\t<div\n\t\tonclick={blah}\n\t></div>',
	'<foo-bar/>': '<foo-bar></foo-bar>',
	'<link/>': '<link/>',
	'<link />': '<link />',
	'<svg><g /></svg>': '<svg><g /></svg>'
};

for (const input in tests) {
	test(input, () => {
		const output = tests[input];
		assert.equal(remove_self_closing_tags(input), output);
	});
}
