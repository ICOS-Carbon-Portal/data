import Bbox from './Bbox';
import Point from './Point';

export default class BboxMapping{
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

	rebaseTo(worldBox){
		let self = this;
		if(worldBox.containsAnother(this._from)) return [this];

		let innerFromBox = this._from.intersect(worldBox);
		let innerMappings = innerFromBox.isEmpty ? [] : [this.getSubMapping(innerFromBox)];

		let listOfListOfOuterMappings = this._from.subtract(worldBox).map(subFromBox => {
			let subMapping = self.getSubMapping(subFromBox);
			let alignedFromBox = subMapping._from.alignTo(worldBox);
			let alignedMapping = new BboxMapping(alignedFromBox, subMapping._to);
			return alignedMapping.rebaseTo(worldBox);
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

