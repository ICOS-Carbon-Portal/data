import CartItem from './CartItem';

export default class Cart {
	readonly _name: string;
	readonly _items: CartItem[];
	readonly _ts: string;

	constructor(name: string | undefined = undefined, items: CartItem[] | undefined = undefined) {
		this._name = name || '';
		this._items = items || [];
		this._ts = (items ? Date.now() + '' : '0');
	}

	get serialize() {
		return {
			name: this._name,
			items: this._items.map(item => item.serialize),
			ts: this._ts
		};
	}

	addItem(cartItem: CartItem[]) {
		return new Cart(this._name, this._items.concat(cartItem));
	}

	removeItems(ids: string[]) {
		return new Cart(this._name, this._items.filter(item => !ids.includes(item.dobj)));
	}

	get ts() {
		return this._ts;
	}

	get isInitialized() {
		return this._ts !== '0';
	}

	get ids() {
		return this._items.map(item => item.dobj);
	}

	get pids() {
		return this._items.map(item => item.dobj.slice(item.dobj.lastIndexOf('/') + 1));
	}

	get count() {
		return this._items.length;
	}

	get items() {
		return this._items;
	}

	item(id: string) {
		return this._items.find(item => item.dobj === id);
	}

	hasItem(id: string) {
		return Boolean(this._items.find(item => item.dobj === id));
	}

	get name() {
		return this._name;
	}

	withName(name: string) {
		return new Cart(name, this._items);
	}

	get size() {
		return this.items.reduce((totSize, item) => totSize + item.size, 0);
	}
}

export const restoreCart = (jsonCart: {cart: any}) => {
	const name: string = jsonCart.cart._name;
	const items: CartItem[] = jsonCart.cart._items?.map((i: {_id: any}) => new CartItem(i._id));

	return new Cart(name, items);
};

const emptyJsonCart = new Cart().serialize;
export type JsonCart = typeof emptyJsonCart;
