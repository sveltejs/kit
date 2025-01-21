## A GET function that only returns body

```js before
/** @type {import('./$types').RequestHandler} */
export function GET() {
	return {
		body: {
			a: 1
		}
	};
}
```

```js after
/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		a: 1
	};
}
```

## A TypeScript GET function that only returns body

```ts before
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return {
		body: {
			a: 1
		}
	};
}
```

```ts after
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		a: 1
	};
}
```

## A GET function in a +layout-foo.server.js

> file: +layout-foo.server.js

```js before
/** @type {import('./$types').RequestHandler} */
export function GET() {
	return {
		body: {
			a: 1
		}
	};
}
```

```js after
/** @type {import('./$types').LayoutServerLoad.foo} */
export function load() {
	return {
		a: 1
	};
}
```

## 200 status

```js before
export function GET() {
	return {
		status: 200,
		body: {
			a: 1
		}
	};
}
```

```js after
export function load() {
	return {
		a: 1
	};
}
```

## Arrow function GET

```js before
/** @type {import('./$types').RequestHandler} */
export const GET = () => ({
	body: {
		a: 1
	}
});
```

```js after
/** @type {import('./$types').PageServerLoad} */
export const load = () => ({
	a: 1
});
```

## POST

```js before
/** @type {import('./$types').RequestHandler} */
export function POST() {
	return {};
}
```

```js after
/** @type {import('./$types').Action} */
export function POST() {
	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292699)");
	return {};
}
```

## A function that returns nothing

```js before
export function GET() {
	return;
}
```

```js after
export function load() {
	return;
}
```

## A function that wrongfully has no body

```js before
export function GET() {
	return {
		status: 200
	};
}
```

```js after
export function load() {
	return ;
}
```

## A get function that only returns body

```js before
import something from 'somewhere';

/** @type {import('./$types').RequestHandler} */
export function get() {
	return {
		body: {
			a: something
		}
	};
}
```

```js after
import something from 'somewhere';

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		a: something
	};
}
```
