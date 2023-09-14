Les variables d'environnement [chargées par Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) depuis les fichiers `.env` et `process.env`. À l'instar de [`$env/dynamic/private`](https://kit.sveltefr.dev/docs/modules#$env-dynamic-private), ce module ne peut pas être importé dans du code côté client. Ce module inclut uniquement les variables dont le nom _ne commence pas_ par [`config.kit.env.publicPrefix`](https://kit.sveltefr.dev/docs/configuration#env) et _commence_ par [`config.kit.env.privatePrefix`](https://kit.sveltefr.dev/docs/configuration#env) (si configuré).

_À la différence_ de [`$env/dynamic/private`](https://kit.sveltefr.dev/docs/modules#$env-dynamic-private), les valeurs exportées depuis ce module sont injectées de manière statique dans votre code généré au moment de la compilation, permettant des optimisations telles que la suppression de code mort.

```ts
import { API_KEY } from '$env/static/private';
```

Notez que toutes les variables d'environnement référencées dans votre code doivent être déclarées (par exemple dans un fichier `.env`), même si elles n'ont pas de valeur tant que l'application n'est pas déployée :

```
MY_FEATURE_FLAG=""
```

Vous pouvez écrasez les valeurs du fichier `.env` depuis la ligne de commande de cette manière :

```bash
MY_FEATURE_FLAG="enabled" npm run dev
```
