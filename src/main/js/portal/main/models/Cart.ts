import CartItem from './CartItem';

export default class Cart {
	readonly _name: string;
	readonly _items: CartItem[];
	readonly _ts: string;

	constructor(name: string | undefined = undefined, items: CartItem[] | undefined = undefined){
		this._name = name || 'My data cart';
		this._items = items || [];
		this._ts = (items ? Date.now() + '' : '0');
	}

	get serialize(){
		return {
			name: this._name,
			items: this._items.map(item => item.serialize),
			ts: this._ts
		}
	}

	addItem(cartItem: CartItem[]){
		return new Cart(this._name, this._items.concat(cartItem));
	}

	removeItems(ids: string[]){
		return new Cart(this._name, this._items.filter(item => !ids.includes(item.id)));
	}

	withItemUrl(id: string, url: string){
		const items = this._items.map(item => {
			return item.id === id
				? item.withUrl(url)
				: item;
		});

		return new Cart(this._name, items);
	}

	get ts(){
		return this._ts;
	}

	get ids(){
		return this._items.map(item => item.id);
	}

	get pids(){
		return this._items.map(item => item.id.slice(item.id.lastIndexOf('/') + 1));
	}

	get count(){
		return this._items.length;
	}

	get items(){
		return this._items;
	}

	item(id: string){
		return this._items.find(item => item.id === id);
	}

	hasItem(id: string){
		return !!this._items.find(item => item.id === id);
	}

	get name(){
		return this._name;
	}

	withName(name: string){
		return new Cart(name, this._items);
	}

	get size(){
		return this.items.reduce((totSize, item) => totSize + item.size, 0);
	}
}

export const restoreCarts = (cartInSessionStorage: {cart: any}, cartInRestheart: {cart: any}) => {
	const sessionStorageTs = cartInSessionStorage.cart && cartInSessionStorage.cart._ts
		? parseInt(cartInSessionStorage.cart._ts)
		: '0';
	const restheartTs = cartInRestheart && cartInRestheart.cart && cartInRestheart.cart._ts
		? parseInt(cartInRestheart.cart._ts)
		: '0';

	const newName = restheartTs > sessionStorageTs
		? cartInRestheart.cart._name
		: cartInSessionStorage.cart._name;

	const sessionStorageItems = cartInSessionStorage.cart && cartInSessionStorage.cart._items
		? cartInSessionStorage.cart._items
		: [];
	const restheartItems = cartInRestheart && cartInRestheart.cart && cartInRestheart.cart._items
		? cartInRestheart.cart._items.filter((item: any) => !Array.isArray(item))
		: [];

	const newItems = restheartItems.concat(sessionStorageItems).filter((item: any, i: number, items: any[]) => {
		return items.findIndex(itm => itm._id === item._id) === i;
	});
	const newCartItems = newItems.map((item: any) => new CartItem(item._dataobject, item._type, item._url));

	return new Cart(newName, newCartItems);
};

const emptyJsonCart = new Cart().serialize;
export type JsonCart = typeof emptyJsonCart;
