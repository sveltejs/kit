const cypress = require('cypress');
const app_switcher_server = require('./src/app-switcher-server');

async function run_cypress() {
	await app_switcher_server.start();

  try {
    await cypress.run(await cypress.cli.parseRunArguments(process.argv.slice(2)));
  }
  finally {
    await app_switcher_server.stop();
  }

	process.exit(0);
}

run_cypress();
