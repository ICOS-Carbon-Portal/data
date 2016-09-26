export default class Point{
	constructor(x, y){
		this._x = x;
		this._y = y;
	}

	get x(){
		return this._x;
	}

	get y(){
		return this._y;
	}

	toString(){
		return `Point(${this._x}, ${this._y})`;
	}
}