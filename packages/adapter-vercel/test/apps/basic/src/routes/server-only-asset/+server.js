import fs from 'node:fs';

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	// a path only known at runtime, which file tracing can't follow
	const dir = /** @type {any} */ (globalThis).SERVER_ONLY_DIR ?? '__SERVER_ONLY_DIR__';
	const name = url.searchParams.get('name') ?? 'data.txt';
	return new Response(fs.readFileSync(new URL(dir + name, import.meta.url), 'utf8'));
}
