Ceci est un simple alias vers `src/lib`, ou tout dossier spécifié par [`config.kit.files.lib`](https://kit.sveltefr.dev/docs/configuration#files). Cela vous permet d'accéder aux composants et utilitaires communs sans l'aberration `../../../../`.

### `$lib/server`

Un sous-dossier de `$lib`. SvelteKit vous empêche d'importer les modules de `$lib/server` dans votre code client. Voir la section [Modules réservés serveur](/docs/server-only-modules).
