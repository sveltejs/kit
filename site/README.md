## Running locally

Set up the project:

```bash
git clone https://github.com/sveltejs/sapper.git
cd sapper/site
npm ci
```

Start the server with `npm run dev`, and navigate to [localhost:3000](http://localhost:3000).

## Translating the API docs

Anchors are automatically generated using headings in the documentation and by default (for the english language) they are latinised to make sure the URL is always conforming to RFC3986.

If we need to translate the API documentation to a language using unicode chars, we can setup this app to export the correct anchors by setting up `SLUG_PRESERVE_UNICODE` to `true` in `config.js`.
