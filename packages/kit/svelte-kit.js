#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const is_postinstall = process.env.npm_lifecycle_event === 'postinstall';
const cwd = is_postinstall ? process.env.INIT_CWD ?? '' : process.cwd();
const svelte_config_file = path.join(cwd, 'svelte.config.js');
const pkg_file = path.join(cwd, 'package.json');
let is_self = false;
let is_workspace = false;
if (is_postinstall && fs.existsSync(pkg_file)) {
	try {
		const pkg = JSON.parse(fs.readFileSync(pkg_file, 'utf-8'));
		is_self = pkg.name === '@sveltejs/kit';
		is_workspace = pkg.devDependencies?.['@sveltejs/kit']?.startsWith('workspace:') ?? false;
		// TODO remove for 1.0
		if (pkg.scripts?.prepare === 'svelte-kit sync') {
			const message = `script "prepare": "svelte-kit sync" in ${pkg_file} is no longer needed. Remove it.`;
			console.error(message);
		}
	} catch (e) {
		// ignore, we can be sure that our own package.json exists and can be parsed, so it is not self
	}
}

if (is_self || !fs.existsSync(svelte_config_file)) {
	if (!is_postinstall) {
		console.warn(
			`Your project at ${cwd} does not have a svelte.config.js  — skipping svelte-kit sync`
		);
	}
} else {
	const cliPath = is_workspace
		? fileURLToPath(new URL('./src/cli.js', import.meta.url))
		: '@sveltejs/kit/dist/cli.js';
	await import(cliPath);
}
