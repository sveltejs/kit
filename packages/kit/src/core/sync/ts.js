import * as e from '../../messages/build-errors.js';

/** @type {typeof import('typescript')} */
// @ts-ignore
export let ts = undefined;
try {
	ts = (await import('typescript')).default;
} catch {
	// TypeScript is an optional peer dependency.
}

// TypeScript 7 does not provide the JavaScript compiler API yet
if (ts && typeof ts.createSourceFile !== 'function') {
	e.typescript_compiler_api_missing({ version: ts.version }, { stackless: true });
}
