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
export function GET() {
	return {
		a: 1
	};
}
```

## Arrow function GET

```js before
export const GET = () => ({
	body: {
		a: 1
	}
});
```

```js after
export const GET = () => ({
	a: 1
});
```

## POST

```js before
export function POST() {
	return {};
}
```

```js after
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
export function GET() {
	return;
}
```
