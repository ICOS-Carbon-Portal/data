export default class BinRaster{
	constructor(arrayBuf, id){
		this._data = new DataView(arrayBuf);
		this.id = id;

		const getHeaderValue = i => this._data.getFloat64(i << 3, false);

		this.height = getHeaderValue(0);
		this.width = getHeaderValue(1);

		this.stats = {
			min: getHeaderValue(2),
			max: getHeaderValue(3)
		};

		this.boundingBox = {
			latMin: getHeaderValue(4),
			latMax: getHeaderValue(5),
			lonMin: getHeaderValue(6),
			lonMax: getHeaderValue(7)
		};
	}

	getValue(y, x){ //e.g. y for lat, x for lon
		const i = (this.height - 1 - y) * this.width + x;
		return this._data.getFloat64((i << 3) + 64, false);
	}
}

