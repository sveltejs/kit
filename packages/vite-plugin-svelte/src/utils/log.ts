import chalk from 'chalk';
// import debug from 'debug'
const levels: string[] = ['debug', 'info', 'warn', 'error', 'silent'];
const prefix = 'vite-plugin-svelte';
const loggers: { [key: string]: any } = {
	debug: {
		log: console.log,
		enabled: false,
		isDebug: true
	},
	info: {
		color: chalk.cyan,
		log: console.log,
		enabled: true
	},
	warn: {
		color: chalk.yellow,
		log: console.warn,
		enabled: true
	},
	error: {
		color: chalk.red,
		log: console.error,
		enabled: true
	},
	silent: {
		enabled: false
	}
};

let _level: string = 'info';
function setLevel(level: string) {
	if (level === _level) {
		return;
	}
	const levelIndex = levels.indexOf(level);
	if (levelIndex > -1) {
		_level = level;
		for (let i = 0; i < levels.length; i++) {
			loggers[levels[i]].enabled = i >= levelIndex;
		}
	} else {
		_log(loggers.error, `invalid log level: ${level} `);
	}
}

let _viteLogOverwriteProtection = false;
function setViteLogOverwriteProtection(viteLogOverwriteProtection: boolean) {
	_viteLogOverwriteProtection = viteLogOverwriteProtection;
}

function _log(logger: any, message: string, payload?: any) {
	if (!logger.enabled) {
		return;
	}
	if (logger.isDebug) {
		payload !== undefined ? logger.log(message, payload) : logger.log(message);
	} else {
		logger.log(logger.color(`[${prefix}] ${message}`));
		if (payload) {
			logger.log(payload);
		}
	}
	if (_viteLogOverwriteProtection) {
		logger.log('');
	}
}

export interface LogFn {
	(message: string, payload?: any): void;
	enabled: boolean;
}

function createLogger(level: string): LogFn {
	const logger = loggers[level];
	const logFn: LogFn = _log.bind(null, logger) as LogFn;
	Object.defineProperty(logFn, 'enabled', {
		get() {
			return logger.enabled;
		}
	});
	return logFn;
}

export const log = {
	debug: createLogger('debug'),
	info: createLogger('info'),
	warn: createLogger('warn'),
	error: createLogger('error'),
	setLevel,

	// TODO still needed?
	setViteLogOverwriteProtection
};
