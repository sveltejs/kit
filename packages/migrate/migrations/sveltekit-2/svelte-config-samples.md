## Removes dangerZone (1)

```js before
export default {
	kit: {
		foo: bar,
		dangerZone: {
			trackServerFetches: true
		},
		baz: qux
	}
};
```

```js after
export default {
	kit: {
		foo: bar,
		baz: qux
	}
};
```

## Removes dangerZone (2)

```js before
export default {
	kit: {
		foo: bar,
		dangerZone: {
			trackServerFetches: true
		}
	}
};
```

<!-- prettier-ignore -->
```js after
export default {
	kit: {
		foo: bar,
	}
};
```
