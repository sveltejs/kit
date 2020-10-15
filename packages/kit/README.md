# @sveltejs/kit

Here be dragons, etc etc.

This is a more fleshed-out version of https://github.com/Rich-Harris/snowpack-svelte-ssr that aims to replicate Sapper's functionality in its entirety, minus building for deployment (which can be handled by 'adapters' that do various opinionated things with the output of `snowpack build`).

It's currently missing a ton of stuff but I figured I'd throw it up on GitHub anyway partly for the sake of 'working in the open' but mostly because I need an issue tracker to organise my thoughts.

There are no tests yet or anything like that. Some of the code has just been straight copied over from the existing Sapper repo, but a pleasing amount of it can safely be left behind.


## Snowpack impressions

This thing is really neat. It has some bugs and missing features, but identifying those is the whole purpose of this experiment, and so far I've been able to MacGyver my way around them:

* ~~the server app and the client app trip over each other [because Snowpack has a global caching mechanism](https://github.com/pikapkg/snowpack/discussions/1060). I'm currently working around it by symlinking various folders for one of the instances~~
* it rewrites imports but seems to do so incorrectly at times? e.g. if you import `foo.svelte` it will rewrite it to `foo.svelte.js`, but that import will fail unless you modify the request to `foo.js`
* ~~it'd be really nice if it exposed a JavaScript API so that it wasn't necessary to invoke the CLI in a child process and communicate with it over HTTP — ideally there'd be a way to 'import' a file from a Snowpack instance, and a way to run Snowpack as middleware that you can use with a regular HTTP server~~


## Trying it out

Clone this repo, `npm install`, and `npm link`. That will create a global link to the `svelte` bin. You can then either `npm run build` or `npm run dev`, if you intend to make changes and see them immediately reflected.

Then, clone the corresponding [svelte-app-demo](https://github.com/sveltejs/svelte-app-demo) repo and follow the instructions therein.