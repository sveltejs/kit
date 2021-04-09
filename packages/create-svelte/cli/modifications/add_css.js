import { bold, green } from 'kleur/colors';
import {
	add_svelte_preprocess_to_config,
	copy_from_template_additions,
	update_component,
	update_package_json_dev_deps
} from './utils';

/**
 * Get the CSS modifications required by file in order to add support to less/scss/css
 *
 * @param {string} template
 * @param {'css' | 'scss' | 'less'} which
 */
const get_modifications_by_template = (template, which) => {
	if (!template || !which) return [];

	const modifications = {
		common: [
			{
				file: 'src/routes/$layout.svelte',
				changes: [['../app.css', `../app.${which}`]]
			},
			{
				file: 'src/routes/index.svelte',
				changes: [['<style>', `<style lang="${which}">`]]
			}
		],
		default: [
			{
				file: 'src/lib/Counter.svelte',
				changes: [['<style>', `<style lang="${which}">`]]
			},
			{
				file: 'src/routes/$layout.svelte',
				changes: [['<style>', `<style lang="${which}">`]]
			},
			{
				file: 'src/lib/DarkModeToggle.svelte',
				changes: [['<style>', `<style lang="${which}">`]]
			},
			{
				file: 'src/lib/HeaderNavigation.svelte',
				changes: [['<style>', `<style lang="${which}">`]]
			}
		]
	};

	return [...modifications.common, ...(template === 'default' ? modifications.default : [])];
};

/**
 * Add chosen CSS language to the project.
 *
 * @param {string} cwd
 * @param {'css' | 'scss' | 'less'} which
 */
export default async function add_css(cwd, which, project_template) {
	const modification_list = get_modifications_by_template(project_template, which);

	if (which === 'css') {
		copy_from_template_additions(cwd, ['src', 'app.css']);
		console.log('You can add support for CSS preprocessors like SCSS/Less/PostCSS later.');
	} else if (which === 'less') {
		update_package_json_dev_deps(cwd, {
			less: '^3.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		copy_from_template_additions(cwd, ['src', 'app.less']);
		modification_list.forEach((modification) => {
			update_component(cwd, modification.file, modification.changes);
		});
		add_svelte_preprocess_to_config(cwd);
		console.log(
			bold(
				green(
					'✔ Added Less support. ' +
						'To use it inside Svelte components, add lang="less" to the attributes of a style tag.'
				)
			)
		);
	} else if (which === 'scss') {
		update_package_json_dev_deps(cwd, {
			sass: '^1.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		copy_from_template_additions(cwd, ['src', 'app.scss']);
		modification_list.forEach((modification) => {
			update_component(cwd, modification.file, modification.changes);
		});
		add_svelte_preprocess_to_config(cwd);
		console.log(
			bold(
				green(
					'✔ Added SCSS support. ' +
						'To use it inside Svelte components, add lang="scss" to the attributes of a style tag.'
				)
			)
		);
	} else {
		console.error(`Unknown CSS option "${which}"`);
	}
}
