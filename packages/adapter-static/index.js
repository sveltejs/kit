const { copy, prerender } = require('@sveltejs/app-utils');

module.exports = async function adapter({
	input,
	output,
	manifest,
	log
}) {
	copy('static', output);
	copy(`${input}/client`, `${output}/_app`);

	prerender({
		force: true,
		input,
		output,
		manifest,
		log
	});
};