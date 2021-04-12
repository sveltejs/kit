import fs from 'fs';
import { bold, green } from 'kleur/colors';
import { join } from 'path';
import { copy_from_template_additions } from './utils';

/**
 * Add Skeleton template if user wants it.
 *
 * @param {string} cwd
 * @param {boolean} yes
 */
export default async function add_skeleton_template(cwd, yes) {
	if (yes) {
		fs.unlinkSync(join(cwd, 'src/lib/Counter.svelte'));
		fs.unlinkSync(join(cwd, 'src/lib/DarkModeToggle.svelte'));
		fs.unlinkSync(join(cwd, 'src/lib/HeaderNavigation.svelte'));

		fs.unlinkSync(join(cwd, 'src/routes/about.svelte'));
		fs.unlinkSync(join(cwd, 'src/routes/blog.svelte'));

		fs.unlinkSync(join(cwd, 'static/menu-background-light.svg'));
		fs.unlinkSync(join(cwd, 'static/menu-background.svg'));
		fs.unlinkSync(join(cwd, 'static/moon-icon.svg'));
		fs.unlinkSync(join(cwd, 'static/sun-icon.svg'));

		fs.unlinkSync(join(cwd, 'src/stores.js'));

		copy_from_template_additions(cwd, {
			from: ['template-skeleton/index.svelte'],
			to: ['src/routes/index.svelte']
		});
		copy_from_template_additions(cwd, {
			from: ['template-skeleton/$layout.svelte'],
			to: ['src/routes/$layout.svelte']
		});

		console.log(bold(green('✔ Skeleton template applied with success.')));
	} else {
		console.log(bold(green('✔ Default template applied with success.')));
	}
}
