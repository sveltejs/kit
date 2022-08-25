import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { tweak_types } from './write_types.js';

test('Rewrites types for a TypeScript module', () => {
	const source = `
		export const GET: Get = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		export const GET = ({ params }: Parameters<Get>[0]) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a TypeScript module without param', () => {
	const source = `
		export const GET: Get = () => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		export const GET = () => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a JavaScript module with `function`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export function GET({ params }) {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		/** @param {Parameters<import('./$types').Get>[0]} event */
		export function GET({ params }) {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a JavaScript module with `const`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`
	);
});

test.run();
