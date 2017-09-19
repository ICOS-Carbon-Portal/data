import CartItem from './CartItem';

export default class Cart {
	constructor(name, items){
		this._name = name || "My data cart";
		this._items = items || [];
	}

	fromStorage(cartInStorage){
		console.log({cartInStorage});
		if (!cartInStorage.cart || cartInStorage.cart === "undefined") return new Cart();

		const jsonCart = cartInStorage.cart._name
			? cartInStorage.cart
			: JSON.parse(cartInStorage.cart);
		const jsonCartItems = jsonCart ? jsonCart._items : [];
		let cart = jsonCart ? new Cart(jsonCart._name) : new Cart();

		jsonCartItems.forEach(item => {
			const type = item._type;
			const url = item._url;
			cart = cart.addItem(new CartItem(item._dataobject, type, url));
		});

		return cart;
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