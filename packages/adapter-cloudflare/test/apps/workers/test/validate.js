import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.TEST_BASE ? '/base' : '';
const root = process.cwd();
const output = path.join(root, '.svelte-kit/cloudflare/worker');
const config = JSON.parse(fs.readFileSync(path.join(output, 'wrangler.json'), 'utf8'));
assert.ok(fs.existsSync(path.join(output, config.main)));
assert.ok(fs.existsSync(path.join(output, 'server/index.js.map')));
const sources = fs
	.readdirSync(output, { recursive: true })
	.filter((file) => file.endsWith('.map'))
	.flatMap((file) => {
		const map = JSON.parse(fs.readFileSync(path.join(output, file), 'utf8'));
		return map.sources.map((source) => path.resolve(output, path.dirname(file), source));
	});
assert.ok(sources.includes(path.join(root, 'src/routes/cf/+server.js')));
assert.equal(config.upload_source_maps, true);
assert.equal(config.no_bundle, true);
assert.ok(config.compatibility_flags.includes('nodejs_als'));
const assets = path.resolve(output, config.assets.directory);
assert.ok(fs.existsSync(path.join(assets, base, 'asset.txt')));
assert.ok(
	fs.readFileSync(path.join(assets, '_headers'), 'utf8').includes(`${base}/_app/immutable/*`)
);
assert.ok(fs.existsSync(path.join(assets, '_redirects')));
const redirect = JSON.parse(fs.readFileSync('.wrangler/deploy/config.json', 'utf8'));
assert.equal(
	path.resolve(root, '.wrangler/deploy', redirect.configPath),
	path.join(output, 'wrangler.json')
);
