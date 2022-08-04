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