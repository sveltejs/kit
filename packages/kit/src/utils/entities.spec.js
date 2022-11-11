import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { decode_html_entities } from './entities.js';

const tests = [['&colon;-&rpar;', ':-)']];

for (const [input, output] of tests) {
	test(input, () => {
		assert.equal(decode_html_entities(input), output);
	});
}

test.run();
