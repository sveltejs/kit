## tsconfig_parse_failed

> Failed to parse TypeScript config

> Failed to parse TypeScript config: %details%

SvelteKit reads your `tsconfig.json` (or `jsconfig.json`) to check that it is compatible with the configuration it generates, and TypeScript could not parse the file. Fix the problem at the reported location. Note that the file may contain comments and trailing commas, but must otherwise be valid JSON.

## typescript_compiler_api_missing

> TypeScript %version% does not provide the JavaScript compiler API required by SvelteKit. Install `typescript@^6.0.0`. To use TypeScript 7 for type checking, install it separately as `@typescript/native`.

SvelteKit uses the TypeScript 6 JavaScript compiler API to validate your `tsconfig.json` (or `jsconfig.json`) and generate route types. TypeScript 7 does not include this API. Keep TypeScript 6 installed as `typescript`, even if you use `@typescript/native` for type checking.
