describe('shows error page', () => {
	before(() => cy.startApp('basics'));

	function assertIsCustomErrorPage() {
		cy.contains('custom error page');
	}

	it('for client-side errors', () => {
		cy.visit('/crash-clientside');

		// this is the Snowpack error overlay (we're in dev mode)
		cy.contains('Crashing now');
	});

	it('for server-side errors', () => {
		cy.visit('/crash-serverside');

		cy.contains('Crashing now');

		assertIsCustomErrorPage();
	});

	it('for errors in preload on the client', () => {
		cy.visit('/crash-preload-client');

		cy.contains('Crashing now');

		assertIsCustomErrorPage();
	});

	it('for errors in preload on the server', () => {
		// not an HTML page
		cy.request({url: '/crash-preload-server', failOnStatusCode: false});

		cy.contains('Crashing now');
	});

	it('for errors in module scope on the client', () => {
		cy.visit('/crash-module-scope-client');

		cy.contains('Crashing now');

		assertIsCustomErrorPage();
	});

	it('for errors in module scope on the server', () => {
		// not an HTML page
		cy.request({url: '/crash-module-scope-server', failOnStatusCode: false});

		cy.contains('Crashing now');
	});
});
