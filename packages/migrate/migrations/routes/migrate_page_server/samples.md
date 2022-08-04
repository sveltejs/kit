## A GET function that only returns body

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
	return {
		a: 1
	};
}
```