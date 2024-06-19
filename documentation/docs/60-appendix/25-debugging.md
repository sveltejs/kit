---
title: Breakpoint Debugging
---

In addition to the [`@debug`](https://svelte.dev/docs/special-tags#debug) tag, you can also debug Svelte and SvelteKit projects using breakpoints within various tools and development environments. This includes both frontend and backend code.

The following guides assume your JavaScript runtime environment is Node.js.

## Visual Studio Code

With the built-in debug terminal, you can set up breakpoints in source files within VSCode.

1. Open the command palette: `CMD/Ctrl` + `Shift` + `P`.
2. Find and launch "Debug: JavaScript Debug Terminal".
3. Start your project using the debug terminal. For example: `npm run dev`.
4. Set some breakpoints in your client or server-side source code.
5. Trigger the breakpoint.

### Launch via debug pane

You may alternatively set up a `.vscode/launch.json` in your project. To set one up automatically:

1. Go to the "Run and Debug" pane.
2. In the "Run" select menu, choose "Node.js...".
3. Select the "run script" that corresponds to your project, such as "Run script: dev".
4. Press the "Start debugging" play button, or hit `F5` to begin breakpoint debugging.

Here's an example `launch.json`:

```json
{
	"version": "0.2.0",
	"configurations": [
		{
			"command": "npm run dev",
			"name": "Run development server",
			"request": "launch",
			"type": "node-terminal"
		}
	]
}
```

Further reading: <https://code.visualstudio.com/docs/editor/debugging>.

## Other Editors

If you use a different editor, these community guides might be useful for you:

- [WebStorm Svelte: Debug Your Application](https://www.jetbrains.com/help/webstorm/svelte.html#ws_svelte_debug)
- [Debugging JavaScript Frameworks in Neovim](https://theosteiner.de/debugging-javascript-frameworks-in-neovim)

## Google Chrome and Microsoft Edge Developer Tools

It's possible to debug Node.js applications using a browser-based debugger.

> Note this only works with debugging client-side SvelteKit source maps.

1. Run the `--inspect` flag when starting the Vite server with Node.js. For instance: `NODE_OPTIONS="--inspect" npm run dev`
2. Open your site in a new tab. Typically at `localhost:5173`.
3. Open your browser's dev tools, and click on the "Open dedicated DevTools for Node.js" icon near the top-left. It should display the Node.js logo.
4. Set up breakpoints and debug your application.

You may alternatively open the debugger devtools by navigating to `chrome://inspect` in Google Chrome, or `edge://inspect` in Microsoft Edge.

## References

- [Debugging Node.js](https://nodejs.org/en/learn/getting-started/debugging)
