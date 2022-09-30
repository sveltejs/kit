/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testMatch: 'tests/**/.*(test|spec).(js|ts)'
};

export default config;
