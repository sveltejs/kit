import { RouteManifest } from '@sveltejs/app-utils';
import { copy } from '@sveltejs/app-utils/files';
import { prerender } from '@sveltejs/app-utils/renderer';
import { Logger } from '@sveltejs/app-utils/renderer/prerender';

module.exports = async function adapter({
	dir,
	manifest,
	log
}: {
	dir: string,
	manifest: RouteManifest,
	log: Logger
}) {
	const out = 'build'; // TODO implement adapter options

	copy('static', out);
	copy(`${dir}/client`, `${out}/_app`);

	prerender({
		force: true,
		dir,
		out,
		manifest,
		log
	});
};
