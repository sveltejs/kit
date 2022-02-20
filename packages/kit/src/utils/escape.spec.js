import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { escape_html_attr } from './escape.js';

const attr = suite('escape_html_attr');

attr('escapes special attribute characters', () => {
	assert.equal(
		escape_html_attr('some "values" are &special here, <others> aren\'t.'),
		'"some &quot;values&quot; are &amp;special here, <others> aren\'t."'
	);
});

attr('escapes invalid surrogates', () => {
	assert.equal(escape_html_attr('\ud800\udc00'), '"\ud800\udc00"');
	assert.equal(escape_html_attr('\ud800'), '"&#55296;"');
	assert.equal(escape_html_attr('\udc00'), '"&#56320;"');
	assert.equal(escape_html_attr('\udc00\ud800'), '"&#56320;&#55296;"');
	assert.equal(escape_html_attr('\ud800\ud800\udc00'), '"&#55296;\ud800\udc00"');
	assert.equal(escape_html_attr('\ud800\udc00\udc00'), '"\ud800\udc00&#56320;"');
	assert.equal(escape_html_attr('\ud800\ud800\udc00\udc00'), '"&#55296;\ud800\udc00&#56320;"');
});

attr.run();
