import CartItem from './CartItem';

export default class Cart {
	constructor(name, items){
		this._name = name || 'My data cart';
		this._items = items || [];
		this._ts = items ? Date.now() + '' : '0';
	}

	addItem(cartItem){
		return new Cart(this._name, this._items.concat(cartItem));
	}

	removeItem(id){
		return new Cart(this._name, this._items.filter(item => item.id !== id));
	}

	withItemSetting(id, setting, value){
		const items = this._items.map(item => {
			return item.id === id
				? item.withSetting(setting, value)
				: item;
		});

		return new Cart(this._name, items);
	}

	withItemUrl(id, url){
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

	item(id){
		return this._items.find(item => item.id === id);
	}

	hasItem(id){
		return !!this._items.find(item => item.id === id);
	}

	get name(){
		return this._name;
	}

	withName(name){
		return new Cart(name, this._items);
	}
}

export const restoreCarts = (cartInLocalStorage, cartInRestheart) => {
	const restheartTs = cartInRestheart.cart._ts
		? parseInt(cartInRestheart.cart._ts)
		: '0';
	const localStorageTs = cartInLocalStorage.cart._ts
		? parseInt(cartInRestheart.cart._ts)
		: '0';

	const newName = restheartTs > localStorageTs
		? cartInRestheart.cart._name
		: cartInLocalStorage.cart._name;
	const newItems = cartInRestheart.cart._items.concat(cartInLocalStorage.cart._items).filter((item, i, items) => {
		return items.findIndex(itm => itm._id === item._id) === i;
	});
	const newCartItems = newItems.map(item => new CartItem(item._dataobject, item._type, item._url));

	return new Cart(newName, newCartItems);
};
