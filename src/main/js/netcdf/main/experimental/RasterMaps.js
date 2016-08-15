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

	alignTo(worldBox){
//console.log('aligning box: ', this.toString(), ' to world: ', worldBox.toString());
		function align1Ddiff(x, xmin, xmax){
			let range = xmax - xmin;
			if(x < xmin) return range * Math.ceil((xmin - x) / range);
			else if(x >= xmax) return xmin + range * ((x - xmin) % range) - x;
			else return 0;
		}
		let dx = align1Ddiff(this._xmin, worldBox._xmin, worldBox._xmax);
		let dy = align1Ddiff(this._ymin, worldBox._ymin, worldBox._ymax);
//console.log('alignment results: dx = ', dx, ' dy = ', dy);
		return new Bbox(this._xmin + dx, this._ymin + dy, this._xmax + dx, this._ymax + dy);
	}

	toString(){
		return `Bbox(${this.minCorner}, ${this.maxCorner})`;
	}
}

class BboxMapping{
	constructor(fromBox, toBox){
		this._from = fromBox;
		this._to = toBox;
	}

	get from() { return this._from; }
	get to() { return this._to; }

	mapXY(x, y){
		if(!this._from.containsXY(x, y)) throw new Error(`(${x}, ${y}) is outside of ${this._from.toString()}`);
		return this._mapXY(x, y);
	}

	_mapXY(x, y){
		return new Point(this._mapX(x), this._mapY(y));
	}

	map(fromPoint){
		return this.mapXY(fromPoint.x, fromPoint.y);
	}

	get isEmpty(){
		return !this._from || !this._to || this._from.isEmpty || this._to.isEmpty;
	}

	getSubMapping(suggestedSubFromBox){
		let subFromBox = this._from.intersect(suggestedSubFromBox);
		if(!subFromBox.isReal) return new BboxMapping(null, null);

		let minXY = this.map(subFromBox.minCorner);
		let maxXY = this.map(subFromBox.maxCorner);
		let subToBox = new Bbox(minXY.x, minXY.y, maxXY.x, maxXY.y);
		return new BboxMapping(subFromBox, subToBox);
	}

	alignTo(worldBox){
		let self = this;
		let fromBox = this._from;
		if(worldBox.containsAnother(fromBox)) return [this];

		let innerFromBox = fromBox.intersect(worldBox);
		let innerMappings = innerFromBox.isEmpty ? [] : [this.getSubMapping(innerFromBox)];

		let listOfListOfOuterMappings = fromBox.subtract(worldBox).map(subFromBox => {
//console.log('subFromBox: ', subFromBox.toString());
			let subMapping = self.getSubMapping(subFromBox);
			let alignedFromBox = subMapping._from.alignTo(worldBox);
//console.log('alignedFromBox: ', alignedFromBox.toString());
			let alignedMapping = new BboxMapping(alignedFromBox, subMapping._to);
//console.log('alignedMapping: ', alignedMapping.toString());
			return alignedMapping.alignTo(worldBox);
		});
		//now flattening the second list of lists and appending it to the first list
		return innerMappings.concat.apply(innerMappings, listOfListOfOuterMappings)
			.filter(mapping => !mapping.isEmpty);
	}

	_mapX(x){
		return this._to.xmin + (x - this._from.xmin) / this._from.xRange * this._to.xRange;
	}

	_mapY(y){
		return this._to.ymin + (y - this._from.ymin) / this._from.yRange * this._to.yRange;
	}

	toString(){
		return `${this._from.toString()} -> ${this._to.toString()}`;
	}
}

class TileMappingHelper{
	constructor(datasetMapping, worldBox){
		this._mappings = datasetMapping.alignTo(worldBox);
		this._worldBox = worldBox;
	}

	getCoordinateMappings(tileMapping){
		let tileCoords = tileMapping._from;
		let datasetMappings = this._mappings.map(mapping => mapping.getSubMapping(tileCoords))
			.filter(mapping => !mapping.isEmpty);
		return datasetMappings.map(dsMapping => {
			let tilePixels = tileMapping.getSubMapping(dsMapping.from).to;
			let datasetPixels = dsMapping.to;
			return new BboxMapping(datasetPixels, tilePixels);
		});
	}
}

let dsPixels = new Bbox(0, 0, 720, 360);
let dsCoords = new Bbox(0, -90, 360, 90);
let dsMapping = new BboxMapping(dsCoords, dsPixels);
let worldBox = new Bbox(-180, -90, 180, 90);

let tileHelper = new TileMappingHelper(dsMapping, worldBox);

//tileHelper._mappings.forEach(m => console.log(m.toString()));

let tileCoords = new Bbox(-10, -10, 10, 10);
let tilePixels = new Bbox(0, 0, 256, 256);
let tileMapping = new BboxMapping(tileCoords, tilePixels);

tileHelper.getCoordinateMappings(tileMapping).forEach(mapping => console.log(mapping.toString()));
