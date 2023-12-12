## Removes throws

```js before
import { redirect, error } from '@sveltejs/kit';

throw redirect();
redirect();
throw error();
error();
function x() {
	let redirect = true;
	throw redirect();
}
```

```js after
import { redirect, error } from '@sveltejs/kit';

redirect();
redirect();
error();
error();
function x() {
	let redirect = true;
	throw redirect();
}
```

## Leaves redirect/error from other sources alone

```js before
import { redirect, error } from 'somewhere-else';

throw redirect();
redirect();
throw error();
error();
```

```js after
import { redirect, error } from 'somewhere-else';

throw redirect();
redirect();
throw error();
error();
```

## Notes cookie migration

```js before
export function load({ cookies }) {
	cookies.set('foo', 'bar');
}
```

```js after
export function load({ cookies }) {
	/* @migration task: add path argument */ cookies.set('foo', 'bar');
}
```

## Notes cookie migration with multiple occurences

```js before
export function load({ cookies }) {
	cookies.delete('foo');
	cookies.set('x', 'y', { z: '' });
}
```

```js after
export function load({ cookies }) {
	/* @migration task: add path argument */ cookies.delete('foo');
	/* @migration task: add path argument */ cookies.set('x', 'y', { z: '' });
}
```

## Handles non-destructured argument

```js before
export function load(event) {
	event.cookies.set('x', 'y');
}
```

```js after
export function load(event) {
	/* @migration task: add path argument */ event.cookies.set('x', 'y');
}
```

## Recognizes false positives

```js before
export function load({ cookies }) {
	cookies.set('foo', 'bar', { path: '/' });
}

export function foo(event) {
	x.cookies.set('foo', 'bar');
}

cookies.set('foo', 'bar');
```

```js after
export function load({ cookies }) {
	cookies.set('foo', 'bar', { path: '/' });
}

export function foo(event) {
	x.cookies.set('foo', 'bar');
}

cookies.set('foo', 'bar');
```
