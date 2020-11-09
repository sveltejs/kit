declare namespace Cypress {
  export interface Chainable {
    startApp(appName: string): Chainable<void>
  }
}