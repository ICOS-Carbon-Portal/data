export default class Stats {
	constructor(timePeriod, params = {}, metadata = [], datasets = []){
		this._timePeriod = timePeriod || 'day'; // day | month | year
		this.params = params;
		this.metadata = metadata;
		this.datasets = datasets;
	}

	get isValidRequest(){
		const {stationId, valueType, height} = this.params;
		return stationId && valueType && height;
	}

	get timePeriod(){
		return this._timePeriod;
	}

	withParams(stationId, valueType, height){
		return new Stats(this._timePeriod, {stationId, valueType, height}, this.metadata, this.datasets);
	}

	withMeasurements(measurements){
		return new Stats(this._timePeriod, this.params, measurements, this.datasets);
	}

	withTimePeriod(timePeriod){
		const datasets = this.datasets.map(d => d.withTimePeriod(timePeriod));
		return new Stats(timePeriod, this.params, this.metadata, datasets);
	}

	withData({binTable, objSpec}){
		const dataset = new Dataset(this._timePeriod, binTable);
		const metadata = this.metadata.map(meta => {
			return meta.dobj === objSpec.id
				? Object.assign(meta, {
					filename: objSpec.filename,
					specLabel: objSpec.specLabel,
				})
				: meta;
		});

		return new Stats(this._timePeriod, this.params, metadata, this.datasets.concat([dataset]));
	}
}

const getHours = (timePeriod) => {
	const dataEnd = new Date( Date.now() - 24*60*60*1000 );

	switch (timePeriod) {
		case 'day':
			return 24;

		case 'month':
			const monthStart = new Date(dataEnd.getFullYear(), dataEnd.getMonth());
			// console.log({monthStart});
			return (dataEnd - monthStart) / 36e5;

		case 'year':
			const yearStart = new Date(dataEnd.getFullYear(), 0);
			// console.log({yearStart});
			return (dataEnd - yearStart) / 36e5;
	}
};

class Dataset {
	constructor(timePeriod, binTable){
		this.timePeriod = timePeriod;
		this.binTable = binTable;
	}

	withTimePeriod(timePeriod){
		return new Dataset(timePeriod, this.binTable);
	}

	get stats(){
		let valCount = 0;
		let min = Infinity;
		let max = - Infinity;

		const values = this.binTable.values([0], v => v)
			.slice(-getHours(this.timePeriod));
		let sum = 0;

		values.forEach(arr => {
			const v = arr[0];

			if (!isNaN(v)) {
				min = Math.min(min, v);
				max = Math.max(max, v);
				sum += v;
				valCount++;
			}
		});

		const mean = sum / valCount;

		return {min, max, mean};
	}

	// calculateStats(timePeriod = this.timePeriod){
	// 	this.valCount = 0;
	// 	this.min = Infinity;
	// 	this.max = - Infinity;
	// 	this.mean = null;
	//
	// 	const values = this.binTable.values([0], v => v).slice(-getHours(timePeriod));
	// 	let sum = 0;
	//
	// 	values.forEach(arr => {
	// 		const v = arr[0];
	//
	// 		if (!isNaN(v)) {
	// 			this.min = Math.min(this.min, v);
	// 			this.max = Math.max(this.max, v);
	// 			sum += v;
	// 			this.valCount++;
	// 		}
	// 	});
	//
	// 	this.mean = sum / this.valCount;
	// }
}
