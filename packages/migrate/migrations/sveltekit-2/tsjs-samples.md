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

## Migrates cookies

```js before
export function load({ cookies }) {
	cookies.delete('x');
	cookies.set('x', 'y', { z: '' });
	cookies.serialize('x', 'y', {});
	cookies.set('x', 'y', {
		z: ''
	});
}
```

```js after
export function load({ cookies }) {
	cookies.delete('x', { path: '.' });
	cookies.set('x', 'y', {
		z: '',
		path: '.'
	});
	cookies.serialize('x', 'y', {
		path: '.'
	});
	cookies.set('x', 'y', {
		z: '',
		path: '.'
	});
}
```

## Handles non-destructured argument

```js before
export function load(event) {
	event.cookies.set('x', 'y');
	event.cookies.delete('x', { x: '' });
}
```

```js after
export function load(event) {
	event.cookies.set('x', 'y', { path: '.' });
	event.cookies.delete('x', {
		x: '',
		path: '.'
	});
}
```

## Recognizes cookies false positives

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

## Replaces resolvePath

```js before
import { resolvePath } from '@sveltejs/kit';

resolvePath('x', y);
```

<!-- prettier-ignore -->
```js after
import { resolveRoute } from "$app/paths";

resolveRoute('x', y);
```

## Replaces resolvePath taking care of imports

```js before
import { resolvePath, x } from '@sveltejs/kit';
import { y } from '$app/paths';

resolvePath('x');
```

```js after
import { x } from '@sveltejs/kit';
import { y, resolveRoute } from '$app/paths';

resolveRoute('x');
```

## Doesn't replace resolvePath from other sources

```js before
import { resolvePath } from 'x';

resolvePath('x');
```

```js after
import { resolvePath } from 'x';

resolvePath('x');
```
