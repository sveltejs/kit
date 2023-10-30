import fs from 'node:fs/promises';
import path from 'node:path';
import { preprocess } from 'svelte/compiler';
import { expect, it } from 'vitest';
import { image, parseObject } from '../src/preprocessor.js';

const resolve = /** @param {string} file */ (file) => path.resolve(__dirname, file);

it('Image preprocess snapshot test', async () => {
	const filename = 'Input.svelte';
	const processed = await preprocess(
		await fs.readFile(resolve(filename), { encoding: 'utf-8' }),
		[image()],
		{ filename }
	);

	// Make imports readable
	const outputCode = processed.code.replace(/import/g, '\n\timport');

	expect(outputCode).toMatchFileSnapshot('./Output.svelte');
});

it('parses an object', () => {
	const parsed = parseObject('{sources:{avif:"/@imagetools/aa851ecbdef6d98bef38810ea9212d3d4cd9712c 1440w, /@imagetools/f5bc22df4071ea198fea2206d55b7bf5f5fc83e6 960w",webp:"/@imagetools/e8afd7da22a03ee0ae914cbfac6c714bded6daaf 1440w, /@imagetools/a5a1cd19d9fdd0754c3dc5122798c31ad3586041 960w",png:"/@imagetools/216a9a139bef55f2d6d70f91bcffe8584152136b 1440w, /@imagetools/e060ca6e665a6e50a24d00e3a7be2a7c96fdeb64 960w"},img:{src:"/@imagetools/216a9a139bef55f2d6d70f91bcffe8584152136b",w:1440,h:1440}}');
	expect(parsed).toBeDefined();
});
