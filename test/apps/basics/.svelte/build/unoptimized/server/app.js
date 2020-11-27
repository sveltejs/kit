import * as renderer from '@sveltejs/kit/assets/renderer';
import root from './_app/main/generated/root.js';
import * as setup from './_app/setup/index.js';

const template = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n\t<meta charset=\"utf-8\">\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n\t%svelte.head%\n</head>\n<body>\n\t%svelte.body%\n</body>\n</html>\n";

const manifest = {
	layout: {"name":"$default_layout","url":"/_app/main/components/layout.svelte"},
	error: {"name":"error","file":"$error.svelte","url":"/_app/routes/$error.svelte"},
	components: [{"name":"index","file":"index.svelte","url":"/_app/routes/index.svelte"},{"name":"crash$45module$45scope$45client","file":"crash-module-scope-client.svelte","url":"/_app/routes/crash-module-scope-client.svelte"},{"name":"crash$45module$45scope$45server","file":"crash-module-scope-server.svelte","url":"/_app/routes/crash-module-scope-server.svelte"},{"name":"crash$45preload$45client","file":"crash-preload-client.svelte","url":"/_app/routes/crash-preload-client.svelte"},{"name":"crash$45preload$45server","file":"crash-preload-server.svelte","url":"/_app/routes/crash-preload-server.svelte"},{"name":"crash$45clientside","file":"crash-clientside.svelte","url":"/_app/routes/crash-clientside.svelte"},{"name":"crash$45serverside","file":"crash-serverside.svelte","url":"/_app/routes/crash-serverside.svelte"},{"name":"dynamic$45$slug","file":"dynamic-[slug].svelte","url":"/_app/routes/dynamic-[slug].svelte"},{"name":"preload","file":"preload.svelte","url":"/_app/routes/preload.svelte"}],
	pages: [
		{ pattern: /^\/$/, parts: [{"component":{"name":"index","file":"index.svelte","url":"/_app/routes/index.svelte"},"params":[]}] },{ pattern: /^\/crash-module-scope-client\/?$/, parts: [{"component":{"name":"crash$45module$45scope$45client","file":"crash-module-scope-client.svelte","url":"/_app/routes/crash-module-scope-client.svelte"},"params":[]}] },{ pattern: /^\/crash-module-scope-server\/?$/, parts: [{"component":{"name":"crash$45module$45scope$45server","file":"crash-module-scope-server.svelte","url":"/_app/routes/crash-module-scope-server.svelte"},"params":[]}] },{ pattern: /^\/crash-preload-client\/?$/, parts: [{"component":{"name":"crash$45preload$45client","file":"crash-preload-client.svelte","url":"/_app/routes/crash-preload-client.svelte"},"params":[]}] },{ pattern: /^\/crash-preload-server\/?$/, parts: [{"component":{"name":"crash$45preload$45server","file":"crash-preload-server.svelte","url":"/_app/routes/crash-preload-server.svelte"},"params":[]}] },{ pattern: /^\/crash-clientside\/?$/, parts: [{"component":{"name":"crash$45clientside","file":"crash-clientside.svelte","url":"/_app/routes/crash-clientside.svelte"},"params":[]}] },{ pattern: /^\/crash-serverside\/?$/, parts: [{"component":{"name":"crash$45serverside","file":"crash-serverside.svelte","url":"/_app/routes/crash-serverside.svelte"},"params":[]}] },{ pattern: /^\/dynamic-([^/]+?)\/?$/, parts: [{"component":{"name":"dynamic$45$slug","file":"dynamic-[slug].svelte","url":"/_app/routes/dynamic-[slug].svelte"},"params":["slug"]}] },{ pattern: /^\/preload\/?$/, parts: [{"component":{"name":"preload","file":"preload.svelte","url":"/_app/routes/preload.svelte"},"params":[]}] }
	],
	endpoints: [
		
	]
};

const client = {"entry":"entry-3b7d24ef.js","deps":{"__entry__":{"js":["entry-3b7d24ef.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css","entry.css"]},"index":{"js":["index-67ef0c8d.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45module$45scope$45client":{"js":["crash-module-scope-client-35602f49.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45module$45scope$45server":{"js":["crash-module-scope-server-b944bf10.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45preload$45client":{"js":["crash-preload-client-314c8fec.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45preload$45server":{"js":["crash-preload-server-45521ea7.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45clientside":{"js":["crash-clientside-2aeb06e9.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"crash$45serverside":{"js":["crash-serverside-1f4c6d49.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"dynamic$45$slug":{"js":["dynamic-[slug]-caea05e3.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]},"preload":{"js":["preload-534d5e2b.js","navigation-6fb20970.js","inject_styles-cd877ae9.js"],"css":["navigation-355ddfcb.css"]}}};

export function render(request, { only_prerender = false } = {}) {
	return renderer.render(request, {
		static_dir: 'static',
		template,
		manifest,
		client,
		root,
		setup,
		load: (route) => require(`./routes/${route.name}.js`),
		dev: false,
		only_prerender
	});
}