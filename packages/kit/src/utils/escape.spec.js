import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { render_json_payload_script, escape_html_attr } from './escape.js';

const json = suite('render_json_payload_script');

json('escapes slashes', () => {
	assert.equal(
		render_json_payload_script({ type: 'props' }, { unsafe: '</script><script>alert("xss")' }),
		'<script type="application/json" sveltekit:data-type="props">' +
			'{"unsafe":"\\u003C/script>\\u003Cscript>alert(\\"xss\\")"}' +
			'</script>'
	);
});

json('escapes exclamation marks', () => {
	assert.equal(
		render_json_payload_script({ type: 'props' }, { '<!--</script>...-->alert("xss")': 'unsafe' }),
		'<script type="application/json" sveltekit:data-type="props">' +
			'{"\\u003C!--\\u003C/script>...-->alert(\\"xss\\")":"unsafe"}' +
			'</script>'
	);
});

json('escapes the attribute values', () => {
	const raw = 'an "attr" & a \ud800';
	const escaped = 'an &quot;attr&quot; &amp; a &#55296;';
	assert.equal(
		render_json_payload_script({ type: 'data', url: raw }, {}),
		`<script type="application/json" sveltekit:data-type="data" sveltekit:data-url="${escaped}">{}</script>`
	);
});

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

json.run();
attr.run();
