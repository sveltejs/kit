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

## A renamed load function

```js before
function myload() {
	return {
		props: {
			a: 1
		}
	};
}

export { myload as load };
```

```js after
function myload() {
	return {
		a: 1
	};
}

export { myload as load };
```

## A load function with a redirect

```js before
export function load({ session }) {
	if (!session.user) {
		return {
			status: 307,
			redirect: '/login'
		};
	}

	return {
		props: {
			a: 1
		};
	}
}
```

```js after
import { redirect } from '@sveltejs/kit';

export function load({ session }) {
	if (!session.user) {
		throw redirect(307, '/login');
	}

	return {
		a: 1
	}
}
```