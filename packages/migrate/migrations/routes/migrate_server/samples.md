## A GET function that returns a JSON object

```js before
export function GET() {
	return {
		body: {
			a: 1
		}
	};
}
```

```js after
import { json } from '@sveltejs/kit';

export function GET() {
	return json({
		a: 1
	});
}
```

## A GET function that returns a JSON object and already specifies a 'json' identifier

```js before
export function GET() {
	const json = 'shadow';

	return {
		body: {
			a: 1
		}
	};
}
```

```js after
import { json as json$1 } from '@sveltejs/kit';

export function GET() {
	const json = 'shadow';

	return json$1({
		a: 1
	});
}
```

## A GET function that returns a JSON object with custom headers

```js before
export function GET() {
	return {
		headers: {
			'x-foo': '123'
		},
		body: {
			a: 1
		}
	};
}
```

```js after
import { json } from '@sveltejs/kit';

export function GET() {
	return json({
		a: 1
	}, {
		headers: {
			'x-foo': '123'
		}
	});
}
```

## A GET arrow function that returns a JSON object

```js before
export const GET = () => ({
	body: {
		a: 1
	}
});
```

```js after
import { json } from '@sveltejs/kit';

export const GET = () => json({
	a: 1
});
```

## GET returns we can't migrate

```js before
export function GET() {
	if (a) {
		return {
			body
		};
	} else if (b) {
		return {
			body: new ReadableStream(),
			headers: {
				'content-type': 'octasomething'
			}
		}
	} else if (c) {
		return {
			body: 'string',
			headers: {
				'x-foo': 'bar'
			}
		}
	}
}
```

```js after
import { json } from '@sveltejs/kit';

export function GET() {
	if (a) {
		throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
		// Suggestion (check for correctness before using):
		// return json(body);
		return {
			body
		};
	} else if (b) {
		throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
		// Suggestion (check for correctness before using):
		// return new Response(new ReadableStream(), {
		// 	headers: {
		// 		'content-type': 'octasomething'
		// 	}
		// });
		return {
			body: new ReadableStream(),
			headers: {
				'content-type': 'octasomething'
			}
		}
	} else if (c) {
		return new Response('string', {
			headers: {
				'x-foo': 'bar'
			}
		})
	}
}
```

## A function that returns a Response

```js before
export const GET = () => new Response('text');
```

```js after
export const GET = () => new Response('text');
```

## A function that returns an unknown value

```js before
export const GET = () => createResponse('text');
```

```js after
throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
export const GET = () => createResponse('text');
```

## A function that returns nothing

```js before
export function GET() {
	return;
}
```

```js after
export function GET() {
	return;
}
```

## A GET function that returns a JSON object

```js before
export function get() {
	return {
		body: {
			a: 1
		}
	};
}
```

```js after
import { json } from '@sveltejs/kit';

export function GET() {
	return json({
		a: 1
	});
}
```
