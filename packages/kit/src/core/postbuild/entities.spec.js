import { assert, test } from 'vitest';
import { decode } from './entities.js';

/*
Test cases shamelessly stolen from https://github.com/fb55/entities/blob/master/src/decode.spec.ts
Reproduced under BSD 2 license
---
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

const tests = [
	{ input: '&amp;amp;', output: '&amp;' },
	{ input: '&amp;#38;', output: '&#38;' },
	{ input: '&amp;#x26;', output: '&#x26;' },
	{ input: '&amp;#X26;', output: '&#X26;' },
	{ input: '&#38;#38;', output: '&#38;' },
	{ input: '&#x26;#38;', output: '&#38;' },
	{ input: '&#X26;#38;', output: '&#38;' },
	{ input: '&#x3a;', output: ':' },
	{ input: '&#x3A;', output: ':' },
	{ input: '&#X3a;', output: ':' },
	{ input: '&#X3A;', output: ':' },
	{ input: '&>', output: '&>' },
	{ input: 'id=770&#anchor', output: 'id=770&#anchor' }
];

for (const { input, output } of tests) {
	test(input, () => {
		assert.equal(decode(input), output);
	});
}

test('should HTML decode partial legacy entity', () => {
	assert.equal(decode('&timesbar'), '×bar');
});

test('should HTML decode legacy entities according to spec', () => {
	assert.equal(decode('?&image_uri=1&ℑ=2&image=3'), '?&image_uri=1&ℑ=2&image=3');
});

test('should back out of legacy entities', () => {
	assert.equal(decode('&ampa'), '&a');
});

test('should parse &nbsp followed by < (#852)', () => {
	assert.equal(decode('&nbsp<'), '\u00a0<');
});
