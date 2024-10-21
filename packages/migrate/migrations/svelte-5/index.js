import { resolve } from 'import-meta-resolve';
import colors from 'kleur';
import { execSync } from 'node:child_process';
import process from 'node:process';
import fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import prompts from 'prompts';
import semver from 'semver';
import glob from 'tiny-glob/sync.js';
import { bail, check_git, update_js_file, update_svelte_file } from '../../utils.js';
import { migrate as migrate_svelte_4 } from '../svelte-4/index.js';
import { migrate as migrate_sveltekit_2 } from '../sveltekit-2/index.js';
import { transform_module_code, transform_svelte_code, update_pkg_json } from './migrate.js';

export async function migrate() {
	if (!fs.existsSync('package.json')) {
		bail('Please re-run this script in a directory with a package.json');
	}

	console.log(
		'This migration is experimental — please report any bugs to https://github.com/sveltejs/svelte/issues'
	);

	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

	const svelte_dep = pkg.devDependencies?.svelte ?? pkg.dependencies?.svelte;
	if (svelte_dep && semver.validRange(svelte_dep) && semver.gtr('4.0.0', svelte_dep)) {
		console.log(
			colors
				.bold()
				.yellow(
					'\nDetected Svelte 3. You need to upgrade to Svelte version 4 first (`npx sv migrate svelte-4`).\n'
				)
		);
		const response = await prompts({
			type: 'confirm',
			name: 'value',
			message: 'Run svelte-4 migration now?',
			initial: false
		});
		if (!response.value) {
			process.exit(1);
		} else {
			await migrate_svelte_4();
			console.log(
				colors
					.bold()
					.green(
						'svelte-4 migration complete. Check that everything is ok, then run `npx sv migrate svelte-5` again to continue the Svelte 5 migration.\n'
					)
			);
			process.exit(0);
		}
	}

	const kit_dep = pkg.devDependencies?.['@sveltejs/kit'] ?? pkg.dependencies?.['@sveltejs/kit'];
	if (kit_dep && semver.validRange(kit_dep) && semver.gtr('2.0.0', kit_dep)) {
		console.log(
			colors
				.bold()
				.yellow(
					'\nDetected SvelteKit 1. You need to upgrade to SvelteKit version 2 first (`npx sv migrate sveltekit-2`).\n'
				)
		);
		const response = await prompts({
			type: 'confirm',
			name: 'value',
			message: 'Run sveltekit-2 migration now?',
			initial: false
		});
		if (!response.value) {
			process.exit(1);
		} else {
			await migrate_sveltekit_2();
			console.log(
				colors
					.bold()
					.green(
						'sveltekit-2 migration complete. Check that everything is ok, then run `npx sv migrate svelte-5` again to continue the Svelte 5 migration.\n'
					)
			);
			process.exit(0);
		}
	}

	let migrate;
	try {
		try {
			({ migrate } = await import_from_cwd('svelte/compiler'));
			if (!migrate) throw new Error('found Svelte 4');
		} catch {
			execSync('npm install svelte@^5.0.0 --no-save', {
				stdio: 'inherit',
				cwd: dirname(fileURLToPath(import.meta.url))
			});
			const url = resolve('svelte/compiler', import.meta.url);
			({ migrate } = await import(url));
		}
	} catch (e) {
		console.log(e);
		console.log(
			colors
				.bold()
				.red(
					'❌ Could not install Svelte. Manually bump the dependency to version 5 in your package.json, install it, then try again.'
				)
		);
		return;
	}

	console.log(
		colors
			.bold()
			.yellow(
				'\nThis will update files in the current directory\n' +
					"If you're inside a monorepo, don't run this in the root directory, rather run it in all projects independently.\n"
			)
	);

	const use_git = check_git();

	const response = await prompts({
		type: 'confirm',
		name: 'value',
		message: 'Continue?',
		initial: false
	});

	if (!response.value) {
		process.exit(1);
	}

	const folders = await prompts({
		type: 'multiselect',
		name: 'value',
		message: 'Which folders should be migrated?',
		choices: fs
			.readdirSync('.')
			.filter(
				(dir) => fs.statSync(dir).isDirectory() && dir !== 'node_modules' && !dir.startsWith('.')
			)
			.map((dir) => ({ title: dir, value: dir, selected: true }))
	});

	if (!folders.value?.length) {
		process.exit(1);
	}

	update_pkg_json();

	// const { default: config } = fs.existsSync('svelte.config.js')
	// 	? await import(pathToFileURL(path.resolve('svelte.config.js')).href)
	// 	: { default: {} };

	/** @type {string[]} */
	const svelte_extensions = /* config.extensions ?? - disabled because it would break .svx */ [
		'.svelte'
	];
	const extensions = [...svelte_extensions, '.ts', '.js'];
	// For some reason {folders.value.join(',')} as part of the glob doesn't work and returns less files
	const files = folders.value.flatMap(
		/** @param {string} folder */ (folder) =>
			glob(`${folder}/**`, { filesOnly: true, dot: true })
				.map((file) => file.replace(/\\/g, '/'))
				.filter((file) => !file.includes('/node_modules/'))
	);

	for (const file of files) {
		if (extensions.some((ext) => file.endsWith(ext))) {
			if (svelte_extensions.some((ext) => file.endsWith(ext))) {
				update_svelte_file(file, transform_module_code, (code) =>
					transform_svelte_code(code, migrate, { filename: file })
				);
			} else {
				update_js_file(file, transform_module_code);
			}
		}
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		"install the updated dependencies ('npm i' / 'pnpm i' / etc) " +
			'(note that there may be peer dependency issues when not all your libraries officially support Svelte 5 yet. In this case try installing with the --force option)',
		use_git && cyan('git commit -m "migration to Svelte 5"'),
		'Review the breaking changes at https://svelte-5-preview.vercel.app/docs/breaking-changes'
		// replace with this once it's live:
		// 'Review the migration guide at https://svelte.dev/docs/svelte/v5-migration-guide',
		// 'Read the updated docs at https://svelte.dev/docs/svelte'
	].filter(Boolean);

	tasks.forEach((task, i) => {
		console.log(`  ${i + 1}: ${task}`);
	});

	console.log('');

	if (use_git) {
		console.log(`Run ${cyan('git diff')} to review changes.\n`);
	}
}

/** @param {string} name */
function import_from_cwd(name) {
	const cwd = pathToFileURL(process.cwd()).href;
	const url = resolve(name, cwd + '/x.js');

	return import(url);
}
