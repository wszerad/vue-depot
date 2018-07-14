import 'reflect-metadata';
import { moduleTypeMeta } from './decorators';
import { devtoolHook } from './devtools';

interface TypesMap {
	[key: string]: any;
}

interface FunctionsMap {
	[key: string]: any;
}

interface DepotOptions {
	name: string;
	computed: FunctionsMap;
	methods: FunctionsMap;
}

export function extractOptions<T extends { new(...args: any[]): {} }>(constructor: T): DepotOptions {
	const modules = extractModules(constructor);
	const options: DepotOptions = {
		name: constructor.name,
		computed: predefineGetters(modules),
		methods: predefineMethods(),
	};
	const proto = constructor.prototype;

	Object.getOwnPropertyNames(proto)
		.forEach((key) => {
			const descriptor = Object.getOwnPropertyDescriptor(proto, key);

			if (!descriptor || key === 'constructor') {
				return;
			} else if (descriptor.set) {
				throw new Error('Setters are not allowed');
			} else if (typeof descriptor.value === 'function') {
				handleMethod(options, key, descriptor);
			} else if (descriptor.get) {
				handleGetter(options, key, descriptor);
			}
		});

	return options;
}

function extractModules<T extends { new(...args: any[]): {} }>(constructor: T) {
	const proto = constructor.prototype;
	const props = new proto.constructor() as any;
	const modules: TypesMap = {};

	Object.getOwnPropertyNames(props)
		.forEach((key) => {
			modules[key] = Reflect.getMetadata(moduleTypeMeta, proto, key);
		});

	return modules;
}

function handleGetter(option: DepotOptions, key: string, descriptor: PropertyDescriptor) {
	option.computed[key] = descriptor.get;
}

function handleMethod(option: DepotOptions, key: string, descriptor: PropertyDescriptor) {
	const method = descriptor.value;

	if (devtoolHook) {
		option.methods[key] = function(...args: any[]) {
			const ret = method.apply(this, args);

			if (ret instanceof Promise) {
				devtoolHook.emit(
					'vuex:mutation',
					{type: `${option.name}:${key}`, args},
					this,
				);
			}

			return ret;
		};
	} else {
		option.methods[key] = descriptor.value;
	}
}

function predefineMethods(): FunctionsMap {
	return {};
}

function predefineGetters(modules: TypesMap): FunctionsMap {
	let getterOverwrite = 'return {';
	let setterOverwrite = '';
	Object.getOwnPropertyNames(modules)
		.forEach((key) => {
			const type = modules[key];
			if (Array.isArray(type)) {
				getterOverwrite += `${key}: this['${key}'].map((i)=>i.state),`;
				setterOverwrite += `if('${key}' in data){ 
					this['${key}'] = data['${key}'].map((i) => {
						var m = new modules['${key}'][0](); m.state = i; return m;
					});
				}`;
			} else if (type) {
				getterOverwrite += `${key}: this['${key}'].state,`;
				setterOverwrite += `if('${key}' in data){ this['${key}'].state = data['${key}']; }`;
			} else {
				getterOverwrite += `${key}: this['${key}'],`;
				setterOverwrite += `if('${key}' in data){ this['${key}'] = data['${key}']; }`;
			}
		});

	getterOverwrite += '}';
	setterOverwrite += '';

	const get = new Function(getterOverwrite);
	const set = new Function('data', 'modules', setterOverwrite);

	return {
		state: {
			get,
			set(this: any, newState: any) {
				set.call(this, newState, modules);
			},
		},
	};
}
