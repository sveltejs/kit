import fs from 'node:fs';
import { pathToFileURL } from 'url';
import * as devalue from 'devalue';
import { prerender } from './prerender.js';

const [, , out, manifest_path, verbose, env_json] = process.argv;
const env = JSON.parse(env_json);

/** @type {import('types').SSRManifest} */
const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

/** @type {import('types').ServerMetadata} */
const metadata = devalue.parse(fs.readFileSync(`${out}/metadata.json`, 'utf-8'));

/** @type {import('types').ServerInternalModule} */
const internal = await import(pathToFileURL(`${out}/server/internal.js`).href);

/** @type {import('types').ServerModule} */
const { Server } = await import(pathToFileURL(`${out}/server/index.js`).href);

// configure `import { building } from '$app/environment'` —
// essential we do this before analysing the code
internal.set_building(true);

const { prerendered, prerender_map } = await prerender({
	Server,
	internal,
	manifest,
	metadata,
	client_out_dir: `${out}/client`,
	verbose,
	env
});

// prerender_map is updated during prerendering, so we need to write it back
fs.writeFileSync(`${out}/prerendered.json`, devalue.stringify({ prerendered, prerender_map }));

process.exit(0);
