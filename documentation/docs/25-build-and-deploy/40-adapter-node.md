---
title: Serveurs Node
---

Pour générer un serveur Node autonome, utilisez [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node).

## Usage

Installez l'adaptateur avec `npm i -D @sveltejs/adapter-node`, puis ajoutez-le à votre fichier `svelte.config.js` :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## Déploiement

Commencez par compiler votre application avec `npm run build`. Ceci va créer le serveur de production dans le dossier défini par `out` dans les options de l'adaptateur, `build` étant le dossier par défaut.

Vous aurez besoin du dossier `out`, du fichier `package.json` de votre projet, et des dépendances de production de votre `node_modules` pour lancer l'application. Les dépendances de production peuvent être générées en copiant les fichiers `package.json` et `package-lock.json`, puis en lançant la commande `npm ci --omit dev` (vous pouvez ignorer cette étape si votre application n'a aucune dépendance). Vous pouvez ensuite lancer votre application avec cette commande :

```bash
node build
```

Les dépendances de développement seront compilées dans votre application grâce à [Rollup](https://rollupjs.org). Pour contrôler si une dépendance donnée est compilée ou externalisée, définissez-la comme `devDependencies` ou `dependencies` respectivement dans votre `package.json`.

## Variables d'environnement

En mode `dev` et `preview`, SvelteKit vient lire vos variables d'environnement depuis le fichier `.env` (ou `.env.local`, ou `.env.[mode]`, [selon l'ordre défini par Vite](https://vitejs.dev/guide/env-and-mode.html#env-files).)

En production, les fichiers `.env` ne sont _pas_ automatiquement chargés. Pour ce faire, installez `dotenv` dans votre projet...

```bash
npm install dotenv
```
...et utilisez-le pour lancer votre application compilée :

```diff
-node build
+node -r dotenv/config build
```

### `PORT`, `HOST` et `SOCKET_PATH`

Par défaut, le serveur accepte les connections sur `0.0.0.0` avec le port 3000. Vous pouvez configurer ces paramètres avec les variables d'environnement `PORT` et `HOST` :

```
HOST=127.0.0.1 PORT=4000 node build
```

Le serveur peut également être configuré pour accepter les connections sur un certain chemin de <span class="vo">[socket](PUBLIC_SVELTE_SITE_URL/docs/web#socket)</span>. Lorsque vous faites cela avec la variable d'environnement `SOCKET_PATH`, les variables d'environnement `HOST` et `PORT` seront ignorées.

```
SOCKET_PATH=/tmp/socket node build
```

### `ORIGIN`, `PROTOCOL_HEADER`, `HOST_HEADER`, et `PORT_HEADER`

Le protocole HTTP ne fournit pas à SvelteKit une méthode fiable pour connaître l'URL qui est actuellement demandée. La méthode la plus simple pour préciser à SvelteKit l'endroit depuis lequel l'application est servie est de définir la variable d'environnement `ORIGIN` :

```
ORIGIN=https://my.site node build

# or e.g. for local previewing and testing
ORIGIN=http://localhost:3000 node build
```

Ainsi, une requête demandant le chemin `/trucs` sera correctement dirigée vers `https://mon.site/trucs`. Sinon, vous pouvez préciser les <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> qui informeront SvelteKit du protocole et de l'hôte de la requête, à partir desquels il pourra construire l'URL d'origine :

```
PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host node build
```

> [`x-forwarded-proto`](https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/X-Forwarded-Proto) et [`x-forwarded-host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) sont des <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> standards de facto qui relaient le protocole et l'hôte d'origine si vous utilisez un <span class="vo">[proxy](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> inversé (pensez <span class="vo">[load balancer](PUBLIC_SVELTE_SITE_URL/docs/web#load-balancer)</span> et <span class="vo">[CDN](PUBLIC_SVELTE_SITE_URL/docs/web#cdn)</span>). Vous ne devriez définir ces variables que si votre serveur est derrière un proxy de confiance ; sinon, il serait possible pour les clients de manipuler ces headers.
> Si vous hébergez votre proxy sur un port non standard, et que votre proxy supporte `x-forwarded-port`, vous pouvez aussi définir `PORT_HEADER=x-forwarded-port`.

Si `adapter-node` ne peut pas correctement déterminer l'URL de votre déploiement, vous pouvez rencontrer cette erreur lors de l'utilisation de [form actions](form-actions) :

> Cross-site POST form submissions are forbidden

(_Les soumissions de formulaire POST <span class="vo">[cross-site](PUBLIC_SVELTE_SITE_URL/docs/web#cross-site)</span> sont interdites_)

### `ADDRESS_HEADER` et `XFF_DEPTH`

L'objet [RequestEvent](types#public-types-requestevent) passé aux <span class="vo">[hooks](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> et aux <span class="vo">[endpoints](PUBLIC_SVELTE_SITE_URL/docs/web#endpoint)</span> contiennent une fonction `event.getClientAddress()` qui renvoie l'adresse IP du client. Par défaut, il s'agit de la `remoteAddress` de connection. Si votre serveur est derrière un ou plusieurs <span class="vo">[proxys](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> (comme un <span class="vo">[load balancer](PUBLIC_SVELTE_SITE_URL/docs/web#load-balancer)</span>), cette valeur sera l'adresse IP du proxy le plus proche plutôt que celle du client, ce qui implique que vous aurez besoin de précier une option `ADDRESS_HEADER` pour lire l'adresse correcte :

```
ADDRESS_HEADER=True-Client-IP node build
```

> Les <span class="vo">[headers](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> peuvent être facilement usurpés. Comme pour `PROTOCOL_HEADER` et `HOST_HEADER`, vous devez [savoir ce que vous faites](https://adam-p.ca/blog/2022/03/x-forwarded-for/) (en anglais) avant de les définir.

Si `ADDRESS_HEADER` vaut `X-Forwarded-For`, la valeur du <span class="vo">[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> sera une liste d'adresses IP séparées par des virgules. La variable d'environnement `XFF_DEPTH` doit alors préciser combien de <span class="vo">[proxys](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> fiables sont devant votre serveur. Par exemple, s'il y a trois proxys, le proxy n°3 relaiera l'adresse de la connection de base ainsi que celles des deux premiers proxys :

```
<adresse du client>, <adresse du proxy 1>, <adresse du proxy 2>
```

Certaines documentations vous indiqueront de lire l'adresse la plus à gauche, mais cela vous rend [vulnérable à l'usurpation](https://adam-p.ca/blog/2022/03/x-forwarded-for/) (en anglais) :

```
<adresse malveillante> <adresse du client>, <adresse du proxy 1>, <adresse du proxy 2>
```

Vous devriez commencer à lire depuis la _droite_, en comptant le nombre de <span class="vo">[proxys](PUBLIC_SVELTE_SITE_URL/docs/web#proxy)</span> fiables. Dans ce cas, nous utiliserions `XFF_DEPTH=3`.

> Si vous avez plutôt besoin de lire l'adresse la plus à gauche (et l'usurpation ne vous inquiète pas) – par exemple pour fournir un service de géolocalisation où il est plus important que l'adresse IP soit _réelle_ plutôt que _fiable_, vous pouvez alors inspecter le <span class="vo">[header](PUBLIC_SVELTE_SITE_URL/docs/web#header)</span> `x-forwarded-for` depuis votre application.

### `BODY_SIZE_LIMIT`

Cette variable d'environnement représent la taille de <span class="vo">[body](PUBLIC_SVELTE_SITE_URL/docs/web#body)</span> de requête maximale à accepter en octets, même en <span class="vo">[streaming](PUBLIC_SVELTE_SITE_URL/docs/web#stream)</span>. Vous pouvez désactiver cette option avec une valeur à `Infinity` (`0` dans les versions précédentes de l'adapteur) et implémenter une vérification personnalisée dans la fonction [`handle`](hooks#hooks-de-serveur-handle) si vous avez besoin de quelque chose plus avancé.

## Options

L'adaptateur peut être configuré avec plusieurs options :

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({
			// options par défaut
			out: 'build',
			precompress: false,
			envPrefix: ''
		})
	}
};
```

### `out`

Le dossier dans lequel compiler le serveur. Par défaut `build` – ce qui signifie que `node build` va démarrer le serveur en local après qu'il ait été créé.

### `precompress`

Permet de précompresser en utilisant gzip et brotli pour les fichiers statiques et les pages prérendues. Elle vaut par défaut `false`.

### `envPrefix`

Si vous avez besoin de changer le nom des variables d'environnement utilisées pour configurer le déploiement (par exemple, pour les distinguer des variables d'environnement que vous ne contrôlez pas), vous pouvez définir un préfixe :

```js
envPrefix: 'MY_CUSTOM_';
```

```sh
MY_CUSTOM_HOST=127.0.0.1 \
MY_CUSTOM_PORT=4000 \
MY_CUSTOM_ORIGIN=https://my.site \
node build
```

## Serveur personnalisé

L'adaptateur crée deux fichiers dans votre dossier de <span class="vo">[build](PUBLIC_SVELTE_SITE_URL/docs/development#build)</span> – `index.js` et `handler.js`. Exécuter `index.js` – par exemple avec `node build` si vous utilisez le dossier de build par défault – va lancer le serveur sur le port configuré.

Autrement, vous pouvez importer le fichier `handler.js`, qui exporte une fonction prévue pour être utilisée avec [Express](https://github.com/expressjs/express), [Connect](https://github.com/senchalabs/connect) ou [Polka](https://github.com/lukeed/polka) (ou même uniquement avec le module intégré [`http.createServer`](https://nodejs.org/dist/latest/docs/api/http.html#httpcreateserveroptions-requestlistener)), et mettre en place votre propre serveur :

```js
// @errors: 2307 7006
/// file: my-server.js
import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// ajoute une route qui est indépendante de votre application SvelteKit
app.get('/healthcheck', (req, res) => {
	res.end('ok');
});

// permet à SvelteKit de gérer tout le reste, incluant les pages prérendues et les fichiers statiques
app.use(handler);

app.listen(3000, () => {
	console.log('listening on port 3000');
});
```

## Résolution de problèmes

### Y a t'il un <span class="vo">[hook](PUBLIC_SVELTE_SITE_URL/docs/sveltejs#hook)</span> pour faire le ménage avant que le serveur ne s'arrête ?

Il n'y a rien de prévu dans SvelteKit pour gérer cela, car un tel nettoyage dépend grandement de l'environnement d'exécution sur lequel vous vous trouvez. Pour Node, vous pouvez utiliser la méthode intégrée `process.on(...)` pour implémenter un <span class="vo">[callback](PUBLIC_SVELTE_SITE_URL/docs/development#callback)</span> qui sera exécuté avant l'arrêt du serveur :

```js
// @errors: 2304 2580
function shutdownGracefully() {
	// tout ce que vous avez besoin de nettoyer manuellement se trouve ici
	db.shutdown();
}

process.on('SIGINT', shutdownGracefully);
process.on('SIGTERM', shutdownGracefully);
```
