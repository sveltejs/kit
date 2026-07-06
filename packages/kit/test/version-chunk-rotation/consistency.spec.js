import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

const timeout = 180_000;

const app_dir = fileURLToPath(new URL('./app', import.meta.url));

/** @param {string} [version] omit to build with the fixture's per-config-load default */
function build(version) {
	const env = { ...process.env };
	if (version === undefined) delete env.SK_VERSION;
	else env.SK_VERSION = version;

	fs.rmSync(path.join(app_dir, '.svelte-kit/output'), { recursive: true, force: true });
	execSync('pnpm build', { cwd: app_dir, stdio: 'pipe', timeout, env });

	return {
		prerendered_page: fs.readFileSync(
			path.join(app_dir, '.svelte-kit/output/prerendered/pages/prerendered.html'),
			'utf-8'
		),
		version_json: /** @type {{ version: string }} */ (
			JSON.parse(
				fs.readFileSync(path.join(app_dir, '.svelte-kit/output/client/_app/version.json'), 'utf-8')
			)
		)
	};
}

test('a version containing </script> cannot terminate the payload script', { timeout }, () => {
	const dangerous_version = '</script><script>alert(1)</script>';

	const { prerendered_page, version_json } = build(dangerous_version);

	assert.notInclude(prerendered_page, dangerous_version);
	assert.include(prerendered_page, '\\u003C/script>', 'the version is escaped, not dropped');
	assert.equal(version_json.version, dangerous_version);
});

test(
	'a version computed per config load resolves to one value for the whole build (#14166)',
	{ timeout },
	() => {
		const { prerendered_page, version_json } = build();

		assert.include(
			prerendered_page,
			`version: "${version_json.version}"`,
			'the payload version and _app/version.json must agree'
		);
	}
);
