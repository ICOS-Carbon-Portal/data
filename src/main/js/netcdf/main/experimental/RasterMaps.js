"use strict";

class Point{
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

class Bbox{
	constructor(l, t, r, b){
		this._l = l;
		this._t = t;
		this._r = r;
		this._b = b;
	}

	get left(){
		return this._l;
	}

	get top(){
		return this._t;
	}

	get right(){
		return this._r;
	}

	get bottom(){
		return this._b;
	}

	get leftTop(){
		return new Point(this._l, this._t);
	}

	get rightBottom(){
		return new Point(this._r, this._b);
	}

	get isReal(){
		return this._l <= this._r && this._t <= this._b;
	}

	intersect(box){
		let l = Math.max(this._l, box._l);
		let t = Math.max(this._t, box._t);
		let r = Math.min(this._r, box._r);
		let b = Math.min(this._b, box._b);
		let intersection = new Bbox(l, t, r, b);
		return intersection.isReal ? intersection : null;
	}

	toString(){
		return `Bbox(${this.leftTop}, ${this.rightBottom})`;
	}
}

class SimpleRasterMapping{
	constructor(pixels, coords){
		this._pixels = pixels;
		this._coodrd = coords;
	}
}

let box1 = new Bbox(0, 0, 20, 10);
let box2 = new Bbox(30, 3, 50, 6);

console.log(box1.intersect(box2).toString());

