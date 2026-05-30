I'd like you to start work on a new framework feature that would replace the existing `$env/*` modules (`$env/dynamic/public`, `$env/static/private` and so on), called 'explicit environment variables'.

If the developer opts in with an `experimental.explicitEnvironmentVariables` flag and has a `src/env.ts` (or `src/env.js`) file, they opt into explicit env vars. This means that the `$env/...` modules can no longer be imported (i.e. they will throw a runtime error if you do so). Instead, env vars can be imported from `$app/env/private` and `$app/env/public`, and static-vs-dynamic is defined in `src/env` on a per-variable basis. `$app/env/private` is a server-only module, and cannot be imported by modules that can run in the client. (This concept already exists in the codebase, you'll find it.)

Additionally, a new `$app/env` module exists, which just contains the existing `$app/environment` module. (If the developer has opted in, importing `$app/environment` should also result in a runtime error.)

The `src/env` module exports a `variables` object, where the keys are the environment variables that should be importable in the rest of the app, and the values are configuration objects. Any env vars that aren't specified here _cannot_ be imported from `$app/env/*` (unlike the current state of affairs, where everything in `process.env` is automatically importable).

A configuration object can have the following properties, all of which are optional:

- `validate` is a Standard Schema validator. It defaults to the equivalent of `z.string()` (though we should implement the validator ourselves rather than introducing a dependency like Zod or Valibot)
- `static` is a boolean that indicates whether the value should be inlined into the build, so that it be used for dead code elimination etc. It defaults to `false`
- `public` is a boolean that is `true` if the variable can imported from `$app/env/public`, `false` if it can be imported from `$app/env/private`. It defaults to `false`
- `description` is a string that will be prepended to the generated code as a JSDoc comment, so that the information appears when the developer hovers over an imported env var

So for example the developer might create a file like this:

```js
import * as v from 'valibot';

export const variables = {
  MY_PRIVATE_DYNAMIC_VAR: {},

  MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION: {
    validate: v.optional(v.picklist(['foo', 'bar', 'baz']), 'foo')
  },

  MY_PRIVATE_INLINE_VAR: {
    inline: true // other possible names: static? built? bundled?
  },

  MY_PUBLIC_VAR: {
    public: true
  },

  MY_DOCUMENTED_VAR: {
    description: 'this will show up when i hover over `MY_DOCUMENTED_VAR` imported from `$app/env/private`
  }
};
```

Implementation-wise, one idea is that this would result in four modules being generated — two developer-facing ones...

```js
// $app/env/public
export {
  MY_PUBLIC_VAR
} from '__sveltekit/env/public';
```

```js
// $app/env/private
export {
  MY_PRIVATE_DYNAMIC_VAR,
  MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION,
  MY_PRIVATE_INLINE_VAR,
  MY_DOCUMENTED_VAR
} from '__sveltekit/env/private';
```

...and two virtual ones:

```js
// __sveltekit/env/public
import { variables } from '../../src/env';

export var MY_PUBLIC_VAR;

export function set(env) {
  MY_PUBLIC_VAR = env.MY_PUBLIC_VAR;

  if (!MY_PUBLIC_VAR) throw new Error('Environment is missing required variable MY_PUBLIC_VAR');
}
```

```js
// __sveltekit/env/private
import { variables } from '../../src/env';

export var MY_PRIVATE_DYNAMIC_VAR;
export var MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION;
export const MY_PRIVATE_INLINE_VAR = '<whatever the value was at build time>';

/** this will show up when i hover over `MY_DOCUMENTED_VAR` imported from `$app/env/private */
export var MY_DOCUMENTED_VAR;

export function set(env) {
  MY_PRIVATE_DYNAMIC_VAR = env.MY_PRIVATE_DYNAMIC_VAR;
  MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION = variables.MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION.validate(env.MY_PRIVATE_DYNAMIC_VAR_WITH_VALIDATION);
  MY_DOCUMENTED_VAR = env.MY_DOCUMENTED_VAR;

  if (!MY_PRIVATE_DYNAMIC_VAR) throw new Error('Environment is missing required variable MY_PRIVATE_DYNAMIC_VAR');
  if (!MY_DOCUMENTED_VAR) throw new Error('Environment is missing required variable MY_DOCUMENTED_VAR');
}
```

The `set` methods would be called inside `server.init({ env, ... })`, before any user code is imported.

I'd like you to write some tests (I would recommend reusing the `options-2` test app), draft some docs, and implement the feature. If any of the above is unclear, please ask me for clarification. I've saved this document as PLAN.md — you can use it to keep track of stuff if that's helpful.
