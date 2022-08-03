## A load function that only exports props

```js before
export function load() {
	return {
		props: {
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

## A file without a load function

```js before
export const prerender = true;
```

```js after
export const prerender = true;
```