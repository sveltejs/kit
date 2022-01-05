import { config } from '../../utils.js';

// remove any projects with javaScriptEnabled
const projects = config.projects || [];
for (let i = projects.length - 1; i >= 0; i--) {
	if (projects[i]?.use?.javaScriptEnabled) {
		projects.splice(i, 1);
	}
}

export default config;
