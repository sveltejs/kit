Cypress.Commands.add('startApp', name => {
	console.log(`will start ${name} server`);

	cy.then({ timeout: 15000 }, async () => {
		const res = await fetch(`http://localhost:3003/start/${name}`);

		expect(res.status).to.equal(200);

		Cypress.config('baseUrl', 'http://localhost:3000');

		console.log('started server');
	});
});
