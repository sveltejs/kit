import fs from 'node:fs/promises';
import path from 'node:path';
import { preprocess } from 'svelte/compiler';
import { expect, it } from 'vitest';
import { image } from '../src/preprocessor.js';

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
