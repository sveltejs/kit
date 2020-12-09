'use strict';

const { readFileSync, existsSync } = require('fs');
const { copy } = require('@sveltejs/app-utils/files');
const { resolve, join } = require('path');
const parse = require('@architect/parser');
const child_process = require('child_process');

function parse_arc(arcPath) {
	if (!existsSync(arcPath)) {
		throw new Error(`No ${arcPath} found. See the documentation.`);
	}

	try {
		const text = readFileSync(arcPath).toString();
		const arc = parse(text);

		return {
			static: arc.static[0][1]
		};
	} catch (e) {
		throw new Error(
			`Error parsing ${arcPath}. Please consult the documentation for correct syntax.`
		);
	}
}

module.exports = async function adapter(builder) {
	builder.log.minor('Parsing app.arc file');
	const { static: static_mount_point } = parse_arc('app.arc');

	const lambda_directory = resolve(join('src', 'http', 'get-index'));
	const static_directory = resolve(static_mount_point);
	const server_directory = resolve(join('src', 'shared'));

	builder.log.minor('Writing client application...');
	builder.copy_static_files(static_directory);
	builder.copy_client_files(static_directory);

  builder.log.minor('Building lambda...');
  copy(join(__dirname, 'files'), lambda_directory);

  builder.log.minor('Installing lambda dependencies...');
	child_process.execSync('npm install', {
		stdio: [0, 1, 2],
		cwd: lambda_directory
  });
  
	builder.log.minor('Writing server application...');
	builder.copy_server_files(server_directory);

	builder.log.minor('Prerendering static pages...');
	await builder.prerender({
		dest: static_directory
	});
};
