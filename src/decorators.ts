import 'reflect-metadata';

import Vue from 'vue';
import { devtoolHook } from './devtools';
import { extractOptions } from './extractors';
import { moduleTypeMeta } from './utils';

export function Store(root: boolean = false) {
	return function <T extends { new(...args: any[]): {} }>(constructor: T): T {
		const options = extractOptions(constructor);

		return class extends Vue {
			constructor() {
				super({
					data() {
						return new constructor.prototype.constructor();
					},
					...options,
				});

				if (root) {
					devtoolHook.emit('vuex:init', this);
					devtoolHook.on('vuex:travel-to-state', (targetState: any) => {
						(this as any).state = targetState;
					});
				}
			}
		} as any;
	};
}

export function module(module: any) {
	return function (target: any, key: string) {
		const type = Reflect.getMetadata('design:type', target, key);
		module = (typeof type === 'function' && type.name === 'Array') ? [module] : module;
		Reflect.defineMetadata(moduleTypeMeta, module, target, key);
	};
}
