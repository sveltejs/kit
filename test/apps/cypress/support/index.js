Cypress.Commands.add('startApp', name => {
	cy.log(`Starting app ${name}...`);

	cy.then({ timeout: 15000 }, async () => {
		const res = await fetch(`http://localhost:3003/start/${name}`);

		expect(res.status).to.equal(200);

		Cypress.config('baseUrl', 'http://localhost:3000');

		console.log('started server');
	});
});
