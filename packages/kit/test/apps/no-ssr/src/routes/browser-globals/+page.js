// `document` is only available in the browser and should cause the test to fail
// if this file is imported on the server
const pathname = document.location.pathname;

export function load() {
	return {
		pathname
	};
}

export const ssr = false;
