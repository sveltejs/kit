---
title: Testing
---

SvelteKit provides test utilities in `@sveltejs/kit/test` for unit testing [remote functions](remote-functions) and components that use them. The core utilities (`createTestEvent`, `withRequestContext`, `callRemote`, `setLocals`, `mockRemote`) are test-runner agnostic.

A [Vitest](https://vitest.dev) plugin is also provided that supplies automatic request context, virtual module resolution, and `.remote.ts` file transforms.

## Testing remote function logic

Test the server-side business logic of your remote functions — call them directly and assert on the result.

### With the Vitest plugin

The `svelteKitTest` plugin handles virtual module resolution and establishes a request context automatically for each test:

```js
/// file: vitest.config.js
import { svelteKitTest } from '@sveltejs/kit/test/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [+++svelteKitTest()+++]
});
```

Remote functions can then be called directly — no wrappers needed:

```js
/// file: src/routes/blog/data.remote.test.ts
import { getPosts } from './data.remote';

test('returns blog posts', async () => {
	const posts = await getPosts();
	expect(posts.length).toBeGreaterThan(0);
	expect(posts[0]).toHaveProperty('title');
});
```

Use `setLocals` to configure `event.locals` for the current test:

```js
/// file: src/routes/dashboard/data.remote.test.ts
import { setLocals } from '@sveltejs/kit/test';
import { getDashboard } from './data.remote';

beforeEach(() => {
	setLocals({ user: { id: '123', role: 'admin' } });
});

test('returns dashboard for authenticated user', async () => {
	const dashboard = await getDashboard();
	// getRequestEvent().locals.user is available inside the remote function
	expect(dashboard.role).toBe('admin');
});
```

### Without the Vitest plugin

Use `createTestEvent` and `withRequestContext` directly with any test runner:

```js
import { createTestEvent, withRequestContext } from '@sveltejs/kit/test';
import { getPosts } from './data.remote';

test('returns blog posts', async () => {
	const event = createTestEvent({ locals: { user: { id: '123' } } });
	const posts = await withRequestContext(event, () => getPosts());
	expect(posts.length).toBeGreaterThan(0);
});
```

You will need to configure virtual module aliases manually in your test runner for `$app/server` and its dependencies.

### callRemote

`callRemote` is a convenience wrapper that auto-detects the function type and sets the HTTP method accordingly (GET for queries, POST for commands and forms):

```js
import { callRemote } from '@sveltejs/kit/test';
import { getPosts, addPost } from './data.remote';

// queries auto-detect GET
const posts = await callRemote(getPosts);

// commands auto-detect POST
const result = await callRemote(addPost, { title: 'Hello', content: '...' });
```

For forms, `callRemote` invokes the internal handler and returns the full output:

```js
import { callRemote } from '@sveltejs/kit/test';
import { contactForm } from './contact.remote';

const output = await callRemote(contactForm, { name: 'Alice', message: 'Hi' });
// output.result — the handler's return value
// output.issues — validation issues (if any)
```

### Validation errors

When a remote function's schema validation fails, an [`HttpValidationError`](@sveltejs-kit-test#HttpValidationError) is thrown with typed `.issues`:

```js
import { HttpValidationError } from '@sveltejs/kit/test';
import { addPost } from './data.remote';

test('rejects invalid input', async () => {
	try {
		await addPost({ title: '' }); // schema requires non-empty title
	} catch (e) {
		if (e instanceof HttpValidationError) {
			expect(e.status).toBe(400);
			expect(e.issues[0].message).toBe('Title is required');
		}
	}
});
```

`HttpValidationError` extends `HttpError`, so existing `instanceof HttpError` checks still pass.

## Testing components

Test Svelte components that use remote functions by controlling what data they receive, without executing server logic.

> [!NOTE] Component testing with `mockRemote` requires the `svelteKitTest({ mode: 'component' })` Vitest plugin. The plugin transforms `.remote.ts` imports to use a mock runtime that reads from the `mockRemote` registry — without it, the imports resolve to server-side code and mocks have no effect.

### Setup

Use the plugin in component mode. This transforms `.remote.ts` imports to use a mock runtime with reactive objects instead of making HTTP requests:

```js
/// file: vitest.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteKitTest } from '@sveltejs/kit/test/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteKitTest({ +++mode: 'component'+++ })]
});
```

### Mocking queries and commands

Given a component that renders data from a remote query:

```svelte
<!--- file: src/routes/blog/+page.svelte --->
<script>
	import { getPosts } from './data.remote';

	const posts = getPosts();
</script>

{#if posts.loading}
	<p>Loading...</p>
{:else}
	<ul>
		{#each posts.current as { title }}
			<li>{title}</li>
		{/each}
	</ul>
{/if}
```

Use `mockRemote` to control what data the component receives:

```js
/// file: src/routes/blog/+page.component.test.ts
import { mockRemote } from '@sveltejs/kit/test';
import { getPosts } from './data.remote';

test('renders blog posts', async () => {
	mockRemote(getPosts).returns([
		{ title: 'First post' },
		{ title: 'Second post' }
	]);

	// render the component and assert on the output
});
```

Mock queries provide the same reactive interface components expect (`.current`, `.loading`, `.ready`, `.error`), backed by Svelte 5 `$state`.

You can also simulate errors:

```js
mockRemote(getPosts).throws(500, { message: 'Database unavailable' });
```

Or provide a dynamic resolver:

```js
mockRemote(getPosts).resolves(() => [{ title: 'Dynamic post' }]);
```

### Mocking forms

Given a component with a form:

```svelte
<!--- file: src/routes/contact/+page.svelte --->
<script>
	import { contactForm } from './contact.remote';
</script>

<form {...contactForm}>
	<input {...contactForm.fields.name.as('text')} />

	{#if contactForm.fields.name.issues()}
		{#each contactForm.fields.name.issues() as issue}
			<span class="error">{issue.message}</span>
		{/each}
	{/if}

	{#if contactForm.result}
		<p class="success">Message sent!</p>
	{/if}

	<button>Send</button>
</form>
```

Use `mockRemote` with form-specific methods to control field values, validation issues, and submission results:

```js
/// file: src/routes/contact/+page.component.test.ts
import { mockRemote } from '@sveltejs/kit/test';
import { contactForm } from './contact.remote';

test('shows validation errors', async () => {
	mockRemote(contactForm).withFieldIssues({
		name: [{ message: 'Name is required' }]
	});

	// render the component — the error message should be visible
});

test('shows success after submission', async () => {
	mockRemote(contactForm).returns({ sent: true });

	// render the component — "Message sent!" should be visible
});

test('pre-populates form fields', async () => {
	mockRemote(contactForm).withFieldValues({
		name: 'Alice',
		message: 'Hello!'
	});

	// render the component — inputs should have the mocked values
});
```

Methods are chainable:

```js
mockRemote(contactForm)
	.returns({ sent: true })
	.withFieldValues({ name: 'Alice' })
	.withFieldIssues({ message: [{ message: 'Too short' }] });
```

The mock form implements the [`RemoteForm`](@sveltejs-kit#RemoteForm) interface:
- `form.fields.name.as('text')` returns input props with the mocked value
- `form.fields.name.value()` returns the mocked field value
- `form.fields.name.issues()` returns the mocked validation issues
- `form.result` returns the mocked submission result

### Using both server + component modes

A project may need both server-mode tests (for remote function logic) and component-mode tests (for rendering). One option is to use [Vitest projects](https://vitest.dev/guide/workspace):

```js
/// file: vitest.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteKitTest } from '@sveltejs/kit/test/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		projects: [
			{
				extends: true,
				plugins: [svelteKitTest({ mode: 'server' })],
				test: {
					name: 'server',
					include: ['src/**/*.test.ts']
				}
			},
			{
				extends: true,
				plugins: [svelteKitTest({ mode: 'component' })],
				test: {
					name: 'component',
					include: ['src/**/*.component.test.ts']
				}
			}
		]
	}
});
```
