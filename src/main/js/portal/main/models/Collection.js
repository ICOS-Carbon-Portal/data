export default class Collection {
	constructor(name, items){
		this._name = name || "My collection";
		this._items = items || [];
	}

	addItem(collectionItem){
		return new Collection(this._name, this._items.concat(collectionItem));
	}

	removeItem(id){
		return new Collection(this._name, this._items.filter(item => item.id !== id));
	}

	get ids(){
		return this._items.map(item => item.id);
	}

	get count(){
		return this._items.length;
	}
}