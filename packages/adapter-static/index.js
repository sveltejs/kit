module.exports = async function adapter(builder) {
	// TODO implement adapter options, allow 'build' to be specified

	builder.copy_static_files('build');
	builder.copy_client_files('build/_app');

	await builder.prerender({
		force: true,
		dest: 'build'
	});
};
