/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	timeout: 2000,
	webServer: {
		command: process.env.DEV ? 'npm run dev' : 'npm run build && npm run preview',
		port: 3000,
		timeout: 10000
	}
};

export default config;
