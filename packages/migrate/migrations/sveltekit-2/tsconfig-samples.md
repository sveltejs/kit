## Removes importsNotUsedAsValues/preserveValueImports

```json before
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}
```

<!-- prettier-ignore -->
```json after
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
	}
}
```

## Leaves tsconfig alone

```json before
{
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}
```

```json after
{
	"compilerOptions": {
		"importsNotUsedAsValues": "error",
		"preserveValueImports": true
	}
}
```
