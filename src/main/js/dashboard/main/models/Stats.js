export default class Stats {
	constructor(params = {}, metadata = [], datasets = []){
		this.params = params;
		this.metadata = metadata;
		this.datasets = datasets;
	}

	get isValidRequest(){
		const {stationId, valueType, height} = this.params;
		return stationId && valueType && height;
	}

	withParams(stationId, valueType, height){
		return new Stats({stationId, valueType, height}, this.metadata, this.datasets);
	}

	withMeasurements(measurements){
		return new Stats(this.params, measurements, this.datasets);
	}

	withData({binTable, yCol, objSpec, nRows}){
		const dataset = new Dataset(binTable, yCol, nRows);
		const metadata = this.metadata.map(meta => {
			return meta.dobj === objSpec.id
				? Object.assign(meta, {
					filename: objSpec.filename,
					specLabel: objSpec.specLabel,
				})
				: meta;
		});

		return new Stats(this.params, metadata, this.datasets.concat([dataset]));
	}
}

class Dataset {
	constructor(binTable, yCol, nRows){
		const values = binTable.values([0], v => v);

		this.nRows = nRows;

		this.valCount = 0;
		this.min = Infinity;
		this.max = - Infinity;
		this.mean = undefined;
		this.sd = undefined;

		this.calculateStats(values);
	}

	calculateStats(values){
		let sum = 0;

		values.forEach(arr => {
			const v = arr[0];

			if (!isNaN(v)) {
				this.min = Math.min(this.min, v);
				this.max = Math.max(this.max, v);
				sum += v;
				this.valCount++;
			}
		});

		this.mean = sum / this.valCount;
	}
}
