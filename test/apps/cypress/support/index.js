Cypress.Commands.add('startApp', (name, mode) => {
	mode = mode == 'prod' ? 'prod' : 'dev';
	
	cy.log(`Starting app ${name} in mode ${mode}...`);

	cy.then({ timeout: 60000 }, async () => {
		const res = await fetch(`http://localhost:3003/start/${name}?mode=${mode}`);

		expect(res.status).to.equal(200);

		Cypress.config('baseUrl', 'http://localhost:3000');
	});
});
