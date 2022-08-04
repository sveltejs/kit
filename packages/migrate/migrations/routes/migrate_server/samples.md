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
export function GET() {
	return new Response(JSON.stringify({
		a: 1
	}), { headers: { 'content-type': 'application/json; charset=utf-8' } });
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
export const GET = () => (new Response(JSON.stringify({
	a: 1
}), { headers: { 'content-type': 'application/json; charset=utf-8' } }));
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
export function GET() {
	if (a) {
		throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
		// Suggestion (check for correctness before using):
		// return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
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