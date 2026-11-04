## tsconfig_parse_failed

> Failed to parse TypeScript config

> Failed to parse TypeScript config: %details%

SvelteKit reads your `tsconfig.json` (or `jsconfig.json`) to check that it is compatible with the configuration it generates, and TypeScript could not parse the file. Fix the problem at the reported location. Note that the file may contain comments and trailing commas, but must otherwise be valid JSON.
