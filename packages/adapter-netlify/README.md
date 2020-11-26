# adapter-netlify

Adapter for Svelte apps that creates a Netlify app, using a function for dynamic server rendering. A future version might use a function per route, though it's unclear if that has any real advantages.

This is very experimental; the adapter API isn't at all fleshed out, and things will definitely change.

## Configuration

This adapter expects to find a [netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration) file in the project root. It will determine where to write static assets and functions to based on the `build.publish` and `build.functions` settings, as per this sample configuration:

```toml
[build]
  command = "npm run build"
  publish = "build/"
  functions = "functions/"
```

It's recommended that you add the `build` and `functions` folders (or whichever other folders you specify) to your `.gitignore`.
