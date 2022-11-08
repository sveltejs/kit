import { config } from '../../utils.js';

config.webServer && (config.webServer.timeout = 45000); // AMP validator needs a long time to get moving

// remove any projects with javaScriptEnabled
const projects = config.projects || [];
for (let i = projects.length - 1; i >= 0; i--) {
	if (projects[i]?.use?.javaScriptEnabled) {
		projects.splice(i, 1);
	}
}

export default config;
