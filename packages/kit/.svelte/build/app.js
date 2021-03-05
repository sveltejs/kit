import * as renderer from '@sveltejs/kit/renderer';
import root from "./generated/root.svelte";
import { set_paths } from "./runtime/internal/singletons.js";
import * as setup from "./setup.js";

const template = ({ head, body }) => "<!DOCTYPE html>\n<html ⚡ lang=\"en\">\n<head>\n\t<meta charset=\"utf-8\">\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n\t<link rel=\"canonical\" href=\".\">\n\t" + head + "\n</head>\n<body>\n\t" + body + "\n</body>\n</html>\n";

set_paths({"base":"","assets":"/."});

// allow paths to be overridden in svelte-kit start
export function init({ paths }) {
	set_paths(paths);
}

init({ paths: {"base":"","assets":"/."} });

const d = decodeURIComponent;
const empty = () => ({});

const components = [
	() => import("../../test/apps/amp/src/routes/invalid/index.svelte"),
	() => import("../../test/apps/amp/src/routes/valid/index.svelte")
];


const css_lookup = {};

const manifest = {
	assets: [],
	layout: () => import("./components/layout.svelte"),
	error: () => import("./components/error.svelte"),
	pages: [
		{
					pattern: /^\/invalid\/?$/,
					params: empty,
					parts: [components[0]],
					css: ["/_app/start.css"],
					js: ["/_app/index.js", "/_app/start.js"]
				},
		{
					pattern: /^\/valid\/?$/,
					params: empty,
					parts: [components[1]],
					css: ["/_app/start.css"],
					js: ["/_app/index2.js", "/_app/start.js"]
				}
	],
	endpoints: [
		{ pattern: /^\/valid\.json$/, params: empty, load: () => import("../../test/apps/amp/src/routes/valid/index.json.js") }
	]
};

export function render(request, {
	paths = {"base":"","assets":"/."},
	local = false,
	only_prerender = false,
	get_static_file
} = {}) {
	return renderer.render(request, {
		paths,
		local,
		template,
		manifest,
		target: null,
		entry: "/./_app/kit.es.js",
		root,
		setup,
		dev: false,
		amp: true,
		only_prerender,
		app_dir: "_app",
		host: null,
		host_header: null,
		get_stack: error => error.stack,
		get_static_file,
		get_amp_css: dep => css_lookup[dep]
	});
}