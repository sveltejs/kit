describe('A second server', () => {
	before(() => cy.startApp('second'));

	it('loads', () => {
		cy.visit('/');

		cy.contains('second');
	});
});
