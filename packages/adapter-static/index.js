const { copy, prerender } = require('@sveltejs/app-utils');

module.exports = async function adapter({
	dir,
	manifest,
	log
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