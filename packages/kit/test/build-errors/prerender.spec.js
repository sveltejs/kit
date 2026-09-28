import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';

const timeout = 60_000;

/**
 * Run `pnpm build` for the given test app and return the captured stderr output.
 * The build is expected to fail — if it doesn't, the test fails.
 * @param {string} app
 * @param {Record<string, string>} [env]
 * @returns {string}
 */
function build(app, env) {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps', app),
			stdio: 'pipe',
			timeout,
			env: { ...process.env, ...env }
		});
	} catch (e) {
		const error = /** @type {{ stderr: Buffer }} */ (e);
		return stripVTControlCharacters(error.stderr.toString());
	}
	assert.fail('Build should have failed');
}

test('prerenderable routes must be prerendered', { timeout }, () => {
	const stderr = build('prerenderable-not-prerendered');

	assert.match(
		stderr,
		/prerender_unseen_routes\nThe following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\n  - \/\[x\]\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/prerender_unseen_routes/
	);
	assert.match(stderr, /To suppress or handle this error, implement `handleUnseenRoutes`/);
});

test('prerendered endpoints cannot have fallback handlers', { timeout }, () => {
	const stderr = build('prerenderable-not-prerendered', { PRERENDER_FALLBACK: 'true' });

	assert.match(
		stderr,
		/prerender_endpoint_methods\nCannot prerender a \+server file with POST, PUT, PATCH, DELETE, QUERY or fallback handlers \(\/fallback\)\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/prerender_endpoint_methods/
	);
});

test('entry generators should match their own route', { timeout }, () => {
	const stderr = build('prerender-entry-generator-mismatch');

	assert.match(
		stderr,
		/prerender_entry_generator_mismatch\nThe entries export from \/\[slug\]\/\[notSpecific\] generated entry \/whatever\/specific, which was matched by \/\[slug\]\/specific\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/prerender_entry_generator_mismatch/
	);
});

test('an error in a `prerender` function should fail the build', { timeout }, () => {
	const stderr = build('prerender-remote-function-error');

	assert.match(stderr, /remote function blew up/);
});

test('a root +server.js returning non-HTML cannot be prerendered', { timeout }, () => {
	const stderr = build('prerender-root-non-html-server');

	assert.match(
		stderr,
		/prerender_root_non_html\nCannot prerender a root \+server\.js that returns a non-HTML response - static hosts always serve an HTML file for `\/`\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/prerender_root_non_html/
	);
});

test('links to missing fragments fail the build by default', { timeout }, () => {
	const stderr = build('prerenderable-incorrect-fragment');

	assert.match(
		stderr,
		/prerender_missing_id\nThe following pages contain links to \/foo#missing, but no element with id="missing" exists on \/foo:\n  - \/\nhttps:\/\/next\.svelte\.dev\/e\/@sveltejs\/kit\/prerender_missing_id/
	);
	assert.match(stderr, /To suppress or handle this error, implement `handleMissingId`/);
});
