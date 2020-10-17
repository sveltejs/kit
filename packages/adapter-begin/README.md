# adapter-begin

Adapter for Svelte apps that creates a [Begin](https://begin.com/) app, using a function for dynamic server rendering.

## Configuration

This adapter expects to find an OpenJS Architect [app.arc](https://arc.codes/) file in the project root. It will determine where to write static assets to based on the `@static` configuration.

```arc
@static
folder public
```
