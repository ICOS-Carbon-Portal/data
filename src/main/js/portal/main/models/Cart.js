import CartItem, {Settings} from './CartItem';

export default class Cart {
	constructor(name, items){
		this._name = name || "My data cart";
		this._items = items || [];
	}

	fromStorage(jsonStr){
		const jsonCart = jsonStr && JSON.parse(jsonStr);
		const jsonCartItems = jsonCart ? jsonCart._items : [];
		var cart = jsonCart ? new Cart(jsonCart._name) : new Cart();

		jsonCartItems.forEach(item => {
			const settings = new Settings(item._settings._xAxis, item._settings._yAxis, item._settings._type);
			cart = cart.addItem(new CartItem(item._dataobject, settings));
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

	get ids(){
		return this._items.map(item => item.id);
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

	get name(){
		return this._name;
	}

	setName(name){
		this._name = name;
	}
}