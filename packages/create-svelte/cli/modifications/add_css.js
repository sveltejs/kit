import { bold, green } from 'kleur/colors';
import { add_svelte_preprocess_to_config, update_component, update_package_json } from './utils';

export default async function add_css(cwd, which) {
	if (which === 'css') {
		console.log('You can add support for CSS preprocessors like SCSS/Less/PostCSS later.');
	} else if (which === 'less') {
		update_package_json(cwd, {
			less: '^3.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		update_component(cwd, 'src/components/Counter.svelte', [['<style>', '<style lang="less">']]);
		update_component(cwd, 'src/routes/index.svelte', [['<style>', '<style lang="less">']]);
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
		update_package_json(cwd, {
			sass: '^1.0.0',
			'svelte-preprocess': '^4.0.0'
		});
		update_component(cwd, 'src/components/Counter.svelte', [['<style>', '<style lang="scss">']]);
		update_component(cwd, 'src/routes/index.svelte', [['<style>', '<style lang="scss">']]);
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
