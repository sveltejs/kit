import { assert, expect, test } from 'vitest';
import { bullet_list } from '../../src/utils/format.js';
import { build, timeout } from './utils.js';

test('prerenderable routes must be prerendered', { timeout }, () => {
	const output = build('prerenderable-not-prerendered');

	expect(output).toContainKitDiagnostic('prerender_unseen_routes', {
		contains: [bullet_list(['/[x]'])]
	});
	assert.match(output, /To suppress or handle this error, implement `handleUnseenRoutes`/);
});

test('prerendered endpoints cannot have fallback handlers', { timeout }, () => {
	const output = build('prerenderable-not-prerendered', { PRERENDER_FALLBACK: 'true' });

	expect(output).toContainKitDiagnostic('prerender_endpoint_methods', {
		contains: ['POST, PUT, PATCH, DELETE, QUERY', '(`/fallback`)']
	});
});

test('entry generators should match their own route', { timeout }, () => {
	const output = build('prerender-entry-generator-mismatch');

	expect(output).toContainKitDiagnostic('prerender_entry_generator_mismatch', {
		contains: ['/[slug]/[notSpecific]', '/whatever/specific', '/[slug]/specific']
	});
});

test('an error in a `prerender` function should fail the build', { timeout }, () => {
	const output = build('prerender-remote-function-error');

	assert.match(output, /remote function blew up/);
});

test('a root +server.js returning non-HTML cannot be prerendered', { timeout }, () => {
	const output = build('prerender-root-non-html-server');

	expect(output).toContainKitDiagnostic('prerender_root_non_html');
});

test('links to missing fragments fail the build by default', { timeout }, () => {
	const output = build('prerenderable-incorrect-fragment');

	expect(output).toContainKitDiagnostic('prerender_missing_id', {
		contains: ['/foo#missing', 'id="missing"', `:\n${bullet_list(['/'])}`]
	});
	assert.match(output, /To suppress or handle this error, implement `handleMissingId`/);
});
