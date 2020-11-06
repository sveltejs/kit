
Cypress.Commands.add('startApp', (name) => {  
  console.log(`will start ${name} server`);
  
  cy.then(async () => {
    const res = await fetch(`http://localhost:3003/start/${name}`);
    
    expect(res.status).to.equal(200);
  
    console.log('started server');
  });
});
