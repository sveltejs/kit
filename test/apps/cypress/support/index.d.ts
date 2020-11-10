declare namespace Cypress {
	export interface Chainable {
		startApp(appName: string, mode?: 'prod' | 'dev'): Chainable<void>;
	}
}
