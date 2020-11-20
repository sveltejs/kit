import { suite } from 'uvu';
import * as assert from 'uvu/assert';
import { exampleRouteManifest } from './index.spec.data';
import { generate_manifest_module } from '.';

const generate_manifest_module_suite = suite('#generate_manifest_module()');

generate_manifest_module_suite('writes manifest', () => {
  const actual = generate_manifest_module(exampleRouteManifest);
  const expected = `
module.exports = {
  layout: {"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"},
  error: {"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"},
  components: [{"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"},{"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"}],
  pages: [{ pattern: /a/, parts: [{"component":{"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"},"params":["quux","corge"]}] },{ pattern: /a/, parts: [{"component":{"default":true,"type":"foo","name":"bar","file":"baz","url":"boo"},"params":["quux","corge"]}] }],
  endpoints: [{ name: 'grault', pattern: /b/, file: 'garply', params: ["waldo","fred"] },{ name: 'grault', pattern: /b/, file: 'garply', params: ["waldo","fred"] }]
};
  `;
	assert.equal(actual, expected.trim());
});

generate_manifest_module_suite.run();
