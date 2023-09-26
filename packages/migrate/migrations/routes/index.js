import fs from 'node:fs';
import colors from 'kleur';
import path from 'node:path';
import prompts from 'prompts';
import glob from 'tiny-glob/sync.js';
import { pathToFileURL } from 'node:url';
import { migrate_scripts } from './migrate_scripts/index.js';
import { migrate_page } from './migrate_page_js/index.js';
import { migrate_page_server } from './migrate_page_server/index.js';
import { migrate_server } from './migrate_server/index.js';
import { adjust_imports, task } from './utils.js';
import { bail, relative, move_file, check_git } from '../../utils.js';

export async function migrate() {
	if (!fs.existsSync('svelte.config.js')) {
		bail('Please re-run this script in a directory with a svelte.config.js');
	}

	const { default: config } = await import(pathToFileURL(path.resolve('svelte.config.js')).href);

	const routes = path.resolve(config.kit?.files?.routes ?? 'src/routes');

	/** @type {string[]} */
	const extensions = config.extensions ?? ['.svelte'];

	/** @type {string[]} */
	const module_extensions = config.kit?.moduleExtensions ?? ['.js', '.ts'];

	/** @type {((filepath: string) => boolean)} */
	const filter =
		config.kit?.routes ??
		((filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known))/.test(filepath));

	const files = glob(`${routes}/**`, { filesOnly: true, dot: true }).map((file) =>
		file.replace(/\\/g, '/')
	);

	// validate before proceeding
	for (const file of files) {
		const basename = path.basename(file);
		if (
			basename.startsWith('+page.') ||
			basename.startsWith('+layout.') ||
			basename.startsWith('+server.') ||
			basename.startsWith('+error.')
		) {
			bail(`It looks like this migration has already been run (found ${relative(file)}). Aborting`);
		}

		if (basename.startsWith('+')) {
			// prettier-ignore
			bail(
				`Please rename any files in ${relative(routes)} with a leading + character before running this migration (found ${relative(file)}). Aborting`
			);
		}
	}

	console.log(colors.bold().yellow('\nThis will overwrite files in the current directory!\n'));

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

	for (const file of files) {
		const basename = path.basename(file);
		if (!filter(file) && !basename.startsWith('__')) continue;

		// replace `./__types` or `./__types/foo` with `./$types`
		const content = fs.readFileSync(file, 'utf8').replace(/\.\/__types(?:\/[^'"]+)?/g, './$types');

		const svelte_ext = extensions.find((ext) => file.endsWith(ext));
		const module_ext = module_extensions.find((ext) => file.endsWith(ext));

		if (svelte_ext) {
			// file is a component
			const bare = basename.slice(0, -svelte_ext.length);
			const [name, layout] = bare.split('@');
			const is_error_page = bare === '__error';

			/**
			 * Whether file should be moved to a subdirectory — e.g. `src/routes/about.svelte`
			 * should become `src/routes/about/+page.svelte`
			 */
			let move_to_directory = false;

			/**
			 * The new name of the file
			 */
			let renamed = file.slice(0, -basename.length);

			/**
			 * If a component has `<script context="module">`, the contents are moved
			 * into a sibling module with the same name
			 */
			let sibling;

			if (bare.startsWith('__layout')) {
				sibling = renamed + '+layout';
				renamed += '+' + bare.slice(2); // account for __layout-foo etc
			} else if (is_error_page) {
				renamed += '+error';
				// no sibling, because error files can no longer have load
			} else if (name === 'index') {
				sibling = renamed + '+page';
				renamed += '+page' + (layout ? '@' + layout : '');
			} else {
				sibling = `${renamed}${name}/+page`;
				renamed += `${name}/+page${layout ? '@' + layout : ''}`;

				move_to_directory = true;
			}

			renamed += svelte_ext;

			const { module, main, ext } = migrate_scripts(content, is_error_page, move_to_directory);

			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			move_file(file, renamed, main, use_git);

			// if component has a <script context="module">, move it to a sibling .js file
			if (module) {
				fs.writeFileSync(sibling + ext, migrate_page(module, bare));
			}
		} else if (module_ext) {
			// file is a module
			const bare = basename.slice(0, -module_ext.length);
			const [name] = bare.split('@');

			/**
			 * Whether the file is paired with a page component, and should
			 * therefore become `+page.server.js`, or not in which case
			 * it should become `+server.js`
			 */
			const is_page_endpoint = extensions.some((ext) =>
				files.includes(`${file.slice(0, -module_ext.length)}${ext}`)
			);

			const type = is_page_endpoint ? '+page.server' : '+server';

			const move_to_directory = name !== 'index';
			const is_standalone_index = !is_page_endpoint && name.startsWith('index.');

			let renamed = '';
			if (is_standalone_index) {
				// handle <folder>/index.json.js -> <folder>.json/+server.js
				const dir = path.dirname(file);
				renamed =
					// prettier-ignore
					`${file.slice(0, -(basename.length + dir.length + 1))}${dir + name.slice('index'.length)}/+server${module_ext}`;
			} else if (move_to_directory) {
				renamed = `${file.slice(0, -basename.length)}${name}/${type}${module_ext}`;
			} else {
				renamed = `${file.slice(0, -basename.length)}${type}${module_ext}`;
			}

			// Standalone index endpoints are edge case enough that we don't spend time on trying to update all the imports correctly
			const edited =
				(is_standalone_index && /import/.test(content) ? `\n// ${task('Check imports')}\n` : '') +
				(!is_standalone_index && move_to_directory ? adjust_imports(content) : content);
			if (move_to_directory) {
				const dir = path.dirname(renamed);
				if (!fs.existsSync(dir)) fs.mkdirSync(dir);
			}

			move_file(
				file,
				renamed,
				is_page_endpoint ? migrate_page_server(edited, bare) : migrate_server(edited),
				use_git
			);
		}
	}

	console.log(colors.bold().green('✔ Your project has been migrated'));

	console.log('\nRecommended next steps:\n');

	const cyan = colors.bold().cyan;

	const tasks = [
		use_git && cyan('git commit -m "svelte-migrate: renamed files"'),
		'Review the migration guide at https://github.com/sveltejs/kit/discussions/5774',
		`Search codebase for ${cyan('"@migration"')} and manually complete migration tasks`,
		use_git && cyan('git add -A'),
		use_git && cyan('git commit -m "svelte-migrate: updated files"')
	].filter(Boolean);

	tasks.forEach((task, i) => {
		console.log(`  ${i + 1}: ${task}`);
	});

	console.log('');

	if (use_git) {
		console.log(`Run ${cyan('git diff')} to review changes.\n`);
	}
}
