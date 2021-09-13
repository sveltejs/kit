import { createRequire } from 'module';
export { fetch, Response, Request, Headers } from '@sveltejs/kit/install-fetch';

// esbuild automatically renames "require"
// So we still have to use Object.defineProperty here
Object.defineProperty(globalThis, 'require', {
	enumerable: true,
	value: createRequire(import.meta.url)
});
