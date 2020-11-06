describe('basics', () => {
	before(() => cy.startApp('basics'));
	
	it('Serves', () => {
		cy.visit('/');

		cy.contains('You\'re on index.svelte');
	});
	
	it('Serves dynamic routes', () => {
		cy.visit('/dynamic-abc');

		cy.contains('Slug: abc');
	});
	
	it('Runs preload', () => {
		cy.visit('/preload');

		cy.contains('bar == bar');
	});
});
