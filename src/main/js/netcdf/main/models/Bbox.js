import Point from './Point';

export default class Bbox{
	constructor(xmin, ymin, xmax, ymax){
		this._xmin = xmin;
		this._ymin = ymin;
		this._xmax = xmax;
		this._ymax = ymax;
	}

	get xmin(){
		return this._xmin;
	}

	get ymin(){
		return this._ymin;
	}

	get xmax(){
		return this._xmax;
	}

	get ymax(){
		return this._ymax;
	}

	get xRange(){
		return this._xmax - this._xmin;
	}

	get yRange(){
		return this._ymax - this._ymin;
	}

	get minCorner(){
		return new Point(this._xmin, this._ymin);
	}

	get maxCorner(){
		return new Point(this._xmax, this._ymax);
	}

	get isReal(){
		return this._xmin <= this._xmax && this._ymin <= this._ymax;
	}

	get isEmpty(){
		return this._xmin >= this._xmax || this._ymin >= this._ymax;
	}

	containsAnother(box){
		return this._xmin <= box._xmin && this._ymin <= box._ymin && this._xmax >= box._xmax && this._ymax >= box._ymax;
	}

	containsXY(x, y){
		return this._xmin <= x && this._xmax >= x && this._ymin <= y && this._ymax >= y;
	}

	containsPoint(point){
		return this.containsXY(point._x, point._y);
	}

	intersect(box){
		let xmin = Math.max(this._xmin, box._xmin);
		let ymin = Math.max(this._ymin, box._ymin);
		let xmax = Math.min(this._xmax, box._xmax);
		let ymax = Math.min(this._ymax, box._ymax);
		return new Bbox(xmin, ymin, xmax, ymax);
	}

	subtract(box){
		let hole = this.intersect(box);
		if(hole.isEmpty) return [this];

		let upper = new Bbox(this._xmin, this._ymin, this._xmax, hole._ymin);
		let lower = new Bbox(this._xmin, hole._ymax, this._xmax, this._ymax);
		let left = new Bbox(this._xmin, hole._ymin, hole._xmin, hole._ymax);
		let right = new Bbox(hole._xmax, hole._ymin, this._xmax, hole._ymax);

		return [upper, lower, left, right].filter(box => !box.isEmpty);
	}

	translate(dx, dy){
		return new Bbox(this._xmin + dx, this._ymin + dy, this._xmax + dx, this._ymax + dy);
	}

	alignTo(worldBox){
		let dx = align1Ddiff(this._xmin, worldBox._xmin, worldBox._xmax);
		let dy = align1Ddiff(this._ymin, worldBox._ymin, worldBox._ymax);
		let res = this.translate(dx, dy);
		return res;
	}

	toString(){
		return `Bbox(${this.minCorner}, ${this.maxCorner})`;
	}
}

function align1Ddiff(x, xmin, xmax){
	let range = xmax - xmin;
	if(x < xmin) return range * Math.ceil((xmin - x) / range);
	else if(x >= xmax) return - range * Math.floor((x - xmin) / range);
	else return 0;
}

