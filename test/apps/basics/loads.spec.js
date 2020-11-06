describe('basics', () => {
	before(() => cy.startApp('basics'));
	
	it('Does not do much!', () => {
		cy.visit('http://localhost:3000');

		cy.contains('basic');
	});
});
