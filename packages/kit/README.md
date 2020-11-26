# @sveltejs/kit

Here be dragons, etc etc.

This project aims to replicate Sapper's functionality in its entirety, minus building for deployment (which can be handled by 'adapters' that do various opinionated things with the output of `snowpack build`).

It's currently missing a ton of stuff but I figured I'd throw it up on GitHub anyway partly for the sake of 'working in the open' but mostly because I need an issue tracker to organise my thoughts.

There are no tests yet or anything like that. Some of the code has just been straight copied over from the existing Sapper repo, but a pleasing amount of it can safely be left behind.

## Trying it out

Clone this repo, `npm install`, and `npm link`. That will create a global link to the `svelte` bin. You can then either `npm run build` or `npm run dev`, if you intend to make changes and see them immediately reflected.

Then, clone the corresponding [svelte-app-demo](https://github.com/sveltejs/svelte-app-demo) repo and follow the instructions therein.
