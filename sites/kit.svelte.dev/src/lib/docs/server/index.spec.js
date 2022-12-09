import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { generate_ts_from_js } from './index.js';

/**
 * @param {string} input
 * @param {string} expected
 */
function test_ts_transformation(input, expected) {
	const output = generate_ts_from_js(input);
	assert.equal(output, expected);
}

test('Creates TS from JS', () => {
	test_ts_transformation(
		`
### sub heading

etc
\`\`\`js
// @errors: 2461
/// file: src/routes/what-is-my-user-agent/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET(event) {
	// log all headers
	console.log(...event.request.headers);

	return json({
		// retrieve a specific header
		userAgent: event.request.headers.get('user-agent')
	});
}
\`\`\`

etc etc
`,
		`
### sub heading

etc
\`\`\`original-js
// @errors: 2461
/// file: src/routes/what-is-my-user-agent/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET(event) {
	// log all headers
	console.log(...event.request.headers);

	return json({
		// retrieve a specific header
		userAgent: event.request.headers.get('user-agent')
	});
}
\`\`\`
\`\`\`generated-ts
// @errors: 2461
/// file: src/routes/what-is-my-user-agent/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = ((event) => {
	// log all headers
	console.log(...event.request.headers);

	return json({
		// retrieve a specific header
		userAgent: event.request.headers.get('user-agent')
	});
}) satisfies RequestHandler;
\`\`\`

etc etc
`
	);
});

test('Creates Svelte-TS from Svelte-JS', () => {
	test_ts_transformation(
		`
### sub heading

etc
\`\`\`svelte
/// file: src/routes/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
\`\`\`

etc etc
`,
		`
### sub heading

etc
\`\`\`original-svelte
/// file: src/routes/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
\`\`\`
\`\`\`generated-svelte
/// file: src/routes/+page.svelte
<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<h1>{data.title}</h1>
<div>{@html data.content}</div>
\`\`\`

etc etc
`
	);
});

test('Leaves JS file as-is if no transformation needed', () => {
	test_ts_transformation(
		`
\`\`\`js
/// file: src/routes/+server.js
let foo = true;
\`\`\`

etc etc
`,
		`
\`\`\`js
/// file: src/routes/+server.js
let foo = true;
\`\`\`

etc etc
`
	);
});

test('Leaves Svelte file as-is if no transformation needed', () => {
	test_ts_transformation(
		`
\`\`\`svelte
/// file: src/routes/+page.svelte
<script>
	let foo = true;
</script>

<p>{foo}</p>
\`\`\`

etc etc
`,
		`
\`\`\`svelte
/// file: src/routes/+page.svelte
<script>
	let foo = true;
</script>

<p>{foo}</p>
\`\`\`

etc etc
`
	);
});

test('Leaves JS file as-is if no named file', () => {
	test_ts_transformation(
		`
\`\`\`js
/** @type {boolean} */
let foo = true;
\`\`\`

etc etc
`,
		`
\`\`\`js
/** @type {boolean} */
let foo = true;
\`\`\`

etc etc
`
	);
});

test('Leaves Svelte file as-is if no named file', () => {
	test_ts_transformation(
		`
\`\`\`svelte
<script>
	/** @type {boolean} */
	let foo = true;
</script>

<p>{foo}</p>
\`\`\`

etc etc
`,
		`
\`\`\`svelte
<script>
	/** @type {boolean} */
	let foo = true;
</script>

<p>{foo}</p>
\`\`\`

etc etc
`
	);
});

test.run();
