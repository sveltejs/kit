---
question: How do I use Sass/SCSS or Less?
---

SvelteKit does not come bundled with [Less](http://lesscss.org/) or [Sass](https://sass-lang.com/) so you will need to make sure to install them:

- For Sass: `npm install -D sass`
- For Less: `npm install -D less`

Then add a `lang` attrigute to your style tags for the language you're using: `<style lang="scss">`

If you want to import a Less/Sass file, you should do so in your `<script>` tag:

```html
<script>
  import './styles.scss'
</script>
```
