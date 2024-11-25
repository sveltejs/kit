import { assert, test } from 'vitest';
import { escape_html } from './escape.js';

test('escape_html_attr escapes special attribute characters', () => {
	assert.equal(
		escape_html('some "values" are &special here, <others> aren\'t.', true),
		"some &quot;values&quot; are &amp;special here, <others> aren't."
	);
});

test('escape_html_attr escapes invalid surrogates', () => {
	assert.equal(escape_html('\ud800\udc00', true), '\ud800\udc00');
	assert.equal(escape_html('\ud800', true), '&#55296;');
	assert.equal(escape_html('\udc00', true), '&#56320;');
	assert.equal(escape_html('\udc00\ud800', true), '&#56320;&#55296;');
	assert.equal(escape_html('\ud800\ud800\udc00', true), '&#55296;\ud800\udc00');
	assert.equal(escape_html('\ud800\udc00\udc00', true), '\ud800\udc00&#56320;');
	assert.equal(escape_html('\ud800\ud800\udc00\udc00', true), '&#55296;\ud800\udc00&#56320;');
});
