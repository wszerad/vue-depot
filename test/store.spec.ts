import { expect } from 'chai';
import { Store, module } from '../src/decorators';
import { Depot } from '../src/Depot';

interface Product {
	id: string;
	name: string;
	price: number;
}

interface CartProduct {
	name: string;
	quantity: number;
	price: number;
}

@Store()
class User extends Depot {
	public name: string = 'user';
	public lastLogin: Date = null;

	public login() {
		this.lastLogin = new Date();
	}
}

@Store()
class WithModules extends Depot {
	@module(User)
	public user: User = new User();

	@module(User)
	public relations: User[] = [new User()];
}

@Store()
class Root extends Depot {
	public id: string = 'id1';
	public added: Product[] = [];
	public all: Product[] = [
		{
			id: '0',
			name: 'kot',
			price: 12,
		},
		{
			id: '1',
			name: 'pies',
			price: 20,
		},
	];

	public async asyncChange(id) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.changeId(id);
				resolve();
			}, 0);
		});
	}

	public changeId(id: string) {
		this.id = id;
	}

	public addToCart(product: Product) {
		this.added.push(product);
	}

	get cartProducts(): CartProduct[] {
		const cart: Map<string, CartProduct> = new Map();

		this.added.forEach(product => {
			if (!cart.has(product.id)) {
				cart.set(product.id, {
					name: product.name,
					quantity: 0,
					price: 0,
				});
			}

			const cartProduct = cart.get(product.id);
			cartProduct!.quantity++;
			cartProduct!.price += product.price;
		});

		return Array.from(cart.values());
	}
}

describe('Store', () => {

	it('props mutations', () => {
		const store = new Root();
		const newId = 'id2';

		expect(store.id).to.equal('id1');
		store.changeId(newId);
		expect(store.id).to.equal(newId);
	});

	it('async props mutations', async () => {
		const store = new Root();
		const newId = 'id2';

		await store.asyncChange(newId);
		expect(store.id).to.equal(newId);
	});

	it('getters', () => {
		const store = new Root();

		expect(store.cartProducts).to.eql([]);
		store.addToCart(store.all[0]);
		expect(store.cartProducts).to
			.eql([
				{name: 'kot', quantity: 1, price: 12},
			]);
	});

	it('state getter', () => {
		const store = new WithModules();

		expect(store.user).to.be.instanceOf(User);
		expect(store.state.user).to.not.be.instanceOf(User);
	});

	it('state setter', () => {
		const store = new WithModules();
		const name = 'test name';

		store.state = {
			user: {
				name,
			},
		};
		expect(store.user.name).to.be.equal(name);
		expect(store.user).to.be.instanceOf(User);
		expect(store.state.user).to.not.be.instanceOf(User);
	});

	it('module collection state getter', () => {
		const store = new WithModules();
		expect(store.relations[0]).to.be.instanceOf(User);
		expect(store.state.relations[0]).to.not.be.instanceOf(User);
		expect(store.relations[0].state).to.not.be.instanceOf(User);
	});

	it('module collection state setter', () => {
		const store = new WithModules();
		const name = 'nested name';
		const oldRelation = store.relations[0];

		store.state = {
			relations: [{name}],
		};

		expect(store.relations.length).to.be.equal(1);
		expect(store.relations[0]).to.be.instanceOf(User);
		expect(store.state.relations[0]).to.not.be.instanceOf(User);
		expect(store.relations[0].state).to.not.be.instanceOf(User);
		expect(store.relations[0]).to.not.be.equal(oldRelation);
	});
});
