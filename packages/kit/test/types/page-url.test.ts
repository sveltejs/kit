import type { Page } from '$app/state';

declare const page: Page;

const url: URL = page.url;

const accept = (input: string | URL): URL =>
	new URL(typeof input === 'string' ? input : input.href);

const copy = accept(page.url);
copy.searchParams.set('q', 'svelte');

const href = page.url.href;
const pathname = page.url.pathname;
const query = page.url.searchParams.get('q');
const values = page.url.searchParams.getAll('q');
const present = page.url.searchParams.has('q');
const serialized = page.url.toString();
const size = page.url.searchParams.size;

if (page.shallow) {
	const shallow_url: URL = page.shallow.url;
	const shallow_copy = accept(page.shallow.url);
	shallow_copy.searchParams.set('q', 'svelte');

	void shallow_url;
	void shallow_copy;
}

// @ts-expect-error readonly search params cannot be appended to
page.url.searchParams.append('a', 'b');

// @ts-expect-error readonly search params cannot be deleted from
page.url.searchParams.delete('a');

// @ts-expect-error readonly search params cannot be set
page.url.searchParams.set('a', 'b');

// @ts-expect-error readonly search params cannot be sorted
page.url.searchParams.sort();

// @ts-expect-error pathname is readonly
page.url.pathname = '/';

// @ts-expect-error href is readonly
page.url.href = 'https://example.com';

// @ts-expect-error search is readonly
page.url.search = '?q=1';

// @ts-expect-error hash is readonly
page.url.hash = '#top';

// @ts-expect-error searchParams is readonly
page.url.searchParams = new URLSearchParams();

void url;
void copy;
void href;
void pathname;
void query;
void values;
void present;
void serialized;
void size;
