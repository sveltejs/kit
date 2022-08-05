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

## String error

```js before
export function load({ session }) {
	if (!session.user?.admin) {
		return {
			status: 403,
			error: 'unauthorized'
		};
	}
}
```

```js after
import { error } from '@sveltejs/kit';

export function load({ session }) {
	if (!session.user?.admin) {
		throw error(403, 'unauthorized');
	}
}
```

## Error constructor

```js before
export function load({ session }) {
	if (!session.user?.admin) {
		return {
			status: 403,
			error: new Error('unauthorized')
		};
	}
}
```

```js after
import { error } from '@sveltejs/kit';

export function load({ session }) {
	if (!session.user?.admin) {
		throw error(403, 'unauthorized');
	}
}
```

## Error status with no error

```js before
export function load() {
	return { status: 518 };
}
```

```js after
import { error } from '@sveltejs/kit';

export function load() {
	throw error(518);
}
```

## Unknown error type

```js before
export function load() {
	return { error: blah };
}
```

```js after
export function load() {
	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
	return { error: blah };
}
```

## Arrow function load

```js before
export const load = () => ({
	props: {
		a: 1
	}
});
```

```js after
export const load = () => ({
	a: 1
});
```

## Arrow function that can't be migrated

```js before
export const load = () => ({
	cache: {
		maxage: 300
	}
});
```

```js after
throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
export const load = () => ({
	cache: {
		maxage: 300
	}
});
```

## Returns cache

```js before
export function load() {
	return {
		cache: {
			maxage: 300
		}
	};
}
```

```js after
export function load() {
	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
	return {
		cache: {
			maxage: 300
		}
	};
}
```

## Returns non-object-literal

```js before
export async function load({ fetch }) {
	const res = await fetch('/x.json');
	return await res.json();
}
```

```js after
export async function load({ fetch }) {
	const res = await fetch('/x.json');
	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");
	return await res.json();
}
```