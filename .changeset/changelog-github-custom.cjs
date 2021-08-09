// taken from https://raw.githubusercontent.com/sveltejs/vite-plugin-svelte/master/scripts/changelog-github-custom.js
// based on https://github.com/atlassian/changesets/blob/main/packages/changelog-github/src/index.ts
// modifications to improve readability:
// - removed thanks notes. We're thanking contributors in the PRs or acknowledge their work in different ways
// - moved issue links to end of first line

const { config } = require('dotenv');
const { getInfo, getInfoFromPullRequest } = require('@changesets/get-github-info');

config();

const changelogFunctions = {
	getDependencyReleaseLine: async (changesets, dependenciesUpdated, options) => {
		if (!options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
			);
		}
		if (dependenciesUpdated.length === 0) return '';

		const changesetLink = `- Updated dependencies [${(
			await Promise.all(
				changesets.map(async (cs) => {
					if (cs.commit) {
						let { links } = await getInfo({
							repo: options.repo,
							commit: cs.commit
						});
						return links.commit;
					}
				})
			)
		)
			.filter((_) => _)
			.join(', ')}]:`;

		const updatedDepenenciesList = dependenciesUpdated.map(
			(dependency) => `  - ${dependency.name}@${dependency.newVersion}`
		);

		return [changesetLink, ...updatedDepenenciesList].join('\n');
	},
	getReleaseLine: async (changeset, type, options) => {
		if (!options || !options.repo) {
			throw new Error(
				'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]'
			);
		}

		let prFromSummary;
		let commitFromSummary;
		let usersFromSummary;

		const replacedChangelog = changeset.summary
			.replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
				let num = Number(pr);
				if (!isNaN(num)) prFromSummary = num;
				return '';
			})
			.replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
				commitFromSummary = commit;
				return '';
			})
			.replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
				usersFromSummary.push(user);
				return '';
			})
			.trim();

		const [firstLine, ...futureLines] = replacedChangelog.split('\n').map((l) => l.trimRight());

		const links = await (async () => {
			if (prFromSummary !== undefined) {
				let { links } = await getInfoFromPullRequest({
					repo: options.repo,
					pull: prFromSummary
				});
				if (commitFromSummary) {
					links = {
						...links,
						commit: `[\`${commitFromSummary}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`
					};
				}
				return links;
			}
			const commitToFetchFrom = commitFromSummary || changeset.commit;
			if (commitToFetchFrom) {
				let { links } = await getInfo({
					repo: options.repo,
					commit: commitToFetchFrom
				});
				return links;
			}
			return {
				commit: null,
				pull: null,
				user: null
			};
		})();

		const suffix = [
			links.pull === null ? '' : ` (${links.pull})`,
			links.commit === null ? '' : ` (${links.commit})`
		].join('');

		return `\n\n- ${firstLine}${suffix}\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
	}
};

module.exports = changelogFunctions;
