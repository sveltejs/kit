import { appendFileSync } from 'node:fs';

/**
 * @class
 * @implements {import('@playwright/test/reporter').Reporter}
 */
export default class GithubFlakyWarningReporter {
	/**
	 * @type {{ file: string; line: number; title: string; message: string; }[]}
	 */
	_flaky = [];

	onBegin() {
		this._flaky = [];
	}
	/**
	 * @param test {import('@playwright/test/reporter').TestCase}
	 */
	onTestEnd(test) {
		if (test.outcome() === 'flaky') {
			const { file, line } = test.location;
			const title = `flaky test: ${test.title}`;
			const message = `retries: ${test.retries}`;
			this._flaky.push({ file, line, title, message });
		}
	}

	onEnd() {
		const output = this._flaky
			.map(
				({ file, line, title, message }) =>
					`::warning file=${file},line=${line},title=${title}::${message}\n`
			)
			.join('');

		appendFileSync(new URL('../../../_tmp_flaky_test_output.txt', import.meta.url), output);
	}

	printsToStdio() {
		return false;
	}
}
