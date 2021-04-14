---
question: How do I use X with SvelteKit?
---

### How do I setup library X?

Please see [sveltejs/integrations](https://github.com/sveltejs/integrations#sveltekit) for examples of using many popular libraries like Tailwind, PostCSS, Firebase, GraphQL, mdsvex, and more.

### How do I setup a database?

Put the code to query your database in [endpoints](../docs#routing-endpoints) - don't query the database in .svelte files. You can create a `db.js` or similar that sets up a connection immediately and makes the client accessible throughout the app as a singleton. You can execute any one-time setup code in `hooks.js` and import your database helpers into any endpoint that needs them.

### How do I use Axios?

You probably don't need it. We'd generally recommend you just use `fetch` instead. If you insist, you're probably better off using the ESM drop-in replacement `redaxios` [until axios utilizes ESM](https://github.com/axios/axios/issues/1879). Finally, if you still want to use Axios itself, try putting it in `optimizeDeps.include`.

### How do I use Sass/SCSS, Less or Stylus?

SvelteKit does not come bundled with[Sass](https://sass-lang.com/), [Less](http://lesscss.org/) or [Stylus](https://stylus-lang.com/) so you will need to make sure to install them:

- For Sass: `npm install -D sass`
- For Less: `npm install -D less`
- For Stylus: `npm install -D stylus`

Then add a `lang` attrigute to your style tags for the language you're using: `<style lang="scss">`

If you want to import a Less/Sass file, you should do so in your `<script>` tag:

```html
<script>
  import './styles.scss'
</script>
```
