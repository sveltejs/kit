---
"@sveltejs/kit": minor
---

feat: `RemoteQueryFunction` gains an optional third generic parameter `Validated` (defaulting to `Input`) that represents the argument type after schema validation/transformation. For queries declared with a [Standard Schema](https://standardschema.dev/), it resolves to `InferOutput<Schema>`, so `requested()` now correctly types `arg` as the post-transform value instead of the pre-transform input.

```ts
import * as v from 'valibot';
import { query } from '$app/server';

const getPost = query(
	v.pipe(v.number(), v.transform(String)),
	async (id) => {/* ... */}
);
// getPost: RemoteQueryFunction<number, Post, string>
//                              ^Input  ^Output ^Validated

for (const { arg } of requested(getPost)) {
	// arg is now typed as string (the post-transform value),
	// previously it was incorrectly typed as number
}
```

Existing code using `RemoteQueryFunction<Input, Output>` continues to work because the new parameter defaults to `Input`.
