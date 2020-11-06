const cypress = require('cypress');
const app_switcher_server = require('./src/app-switcher-server');

async function run_cypress() {
	await app_switcher_server.start();

	try {
		const command = process.argv[2];
		const args = process.argv.slice(3);

		const options = await cypress.cli.parseRunArguments(['cypress', 'run'].concat(args));

		await (command === 'open' ? cypress.open : cypress.run)(options);
	} catch (e) {
		console.error(e);
	} finally {
		await app_switcher_server.stop();
	}

	process.exit(0);
}

run_cypress();
