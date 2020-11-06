describe('second', () => {
	before(() => cy.startApp('second'));

	it('Does not do much!', () => {
		cy.visit('http://localhost:3000');

		cy.contains('second');
	});
});
