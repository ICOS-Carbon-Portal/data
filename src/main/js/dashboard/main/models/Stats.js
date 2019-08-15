export default class Stats {
	constructor(timePeriod, params = {}, metadata = [], datasets = [], firstTimestamp, lastTimestamp){
		this._timePeriod = timePeriod || 'day'; // day | month | year
		this.params = params;
		this.metadata = metadata;
		this.datasets = datasets;
		this.firstTimestamp = firstTimestamp;
		this.lastTimestamp = lastTimestamp;
	}

	get isValidRequest(){
		const {stationId, valueType, height} = this.params;
		return stationId && valueType && height;
	}

	get timePeriod(){
		return this._timePeriod;
	}

	get startStop(){
		if (this.lastTimestamp === undefined) return;

		const getStartOfDay = date => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
		const getStartOfPreviousMonth = date => Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1);
		const getStartOfPreviousYear = date => Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth(), 1);

		switch (this._timePeriod) {
			case 'day':
				return {
					start: Math.max(this.firstTimestamp, getStartOfDay(new Date(this.lastTimestamp))),
					stop: this.lastTimestamp
				};

			case 'month':
				const startOfPreviousMonth = new Date(getStartOfPreviousMonth(new Date(this.lastTimestamp)));
				const endOfPreviousMonth = Date.UTC(
					startOfPreviousMonth.getUTCFullYear(),
					startOfPreviousMonth.getUTCMonth() + 1,
					0,
					23,
					59,
					59);

				return {
					start: Math.max(this.firstTimestamp, startOfPreviousMonth.getTime()),
					stop: endOfPreviousMonth
				};

			case 'year':
				const startPreviousYear = new Date(getStartOfPreviousYear(new Date(this.lastTimestamp)));
				const stop = Date.UTC(
					startPreviousYear.getUTCFullYear() + 1,
					startPreviousYear.getUTCMonth(),
					0,
					23,
					59,
					59);

				return {
					start: Math.max(this.firstTimestamp, startPreviousYear.getTime()),
					stop
				};
		}
	}

	get calculatedStats(){
		// binTable contains three columns on each row; TIMESTAMP (ms), data value and quality flag
		const startStop = this.startStop;
		if (startStop === undefined || this.datasets.length < 2) {
			return {min: 0, max: 0, mean: 0};
		}

		const getRows = dataset => {
			if (dataset.binTable === undefined) return [];

			return dataset.binTable
				.values([0, 1, 2], v => v)
				.filter(row =>
					!isNaN(row[1])
					&& row[0] >= startStop.start && row[0] <= startStop.stop
					&& (dataset.dataLevel === 1 && row[2] === 'U' || dataset.dataLevel === 2 && row[2] === 'O')
				);
		};
		const lvl1Rows = getRows(this.datasets.find(ds => ds.dataLevel === 1));
		const lvl2Rows = getRows(this.datasets.find(ds => ds.dataLevel === 2));

		let values = [];
		let idx = 0;
		let idx1 = 0;
		let idx2 = 0;

		// Merge values from two binTables and give priority to dataLevel 2
		while (idx < (lvl1Rows.length + lvl2Rows.length)){
			const ts1 = lvl1Rows[idx1] ? lvl1Rows[idx1][0] : Infinity;
			const ts2 = lvl2Rows[idx2] ? lvl2Rows[idx2][0] : Infinity;

			if (ts1 === ts2 && ts2 !== Infinity){
				values[idx] = lvl2Rows[idx2][1];
				idx1++;
				idx2++;
			} else if (ts1 < ts2 && ts1 !== Infinity){
				values[idx] = lvl1Rows[idx1][1];
				idx1++;
			} else if (ts1 > ts2 && ts2 !== Infinity) {
				values[idx] = lvl2Rows[idx2][1];
				idx2++;
			}

			idx++;
		}

		let valCount = 0;
		let min = Infinity;
		let max = - Infinity;
		let sum = 0;

		values.forEach(v => {
			min = Math.min(min, v);
			max = Math.max(max, v);
			sum += v;
			valCount++;
		});

		return {min, max, mean: (sum / valCount)};
	}

	get isComplete(){
		return this.metadata.length > 0 && this.startStop !== undefined && this.datasets.length === 2;
	}

	get error(){
		if (this.datasets.length === 2 && this.metadata.length === 0) {
			return 'No data could be found. Check URL.';
		}
	}

	withParams(stationId, valueType, height){
		return new Stats(this._timePeriod, {stationId, valueType, height}, this.metadata, this.datasets, this.firstTimestamp, this.lastTimestamp);
	}

	withMeasurements(measurements){
		return new Stats(this._timePeriod, this.params, this.metadata.concat(measurements), this.datasets, this.firstTimestamp, this.lastTimestamp);
	}

	withTimePeriod(timePeriod){
		return new Stats(timePeriod, this.params, this.metadata, this.datasets, this.firstTimestamp, this.lastTimestamp);
	}

	withData({dataLevel, binTable, objSpec}){
		const dataset = new Dataset(dataLevel, binTable, objSpec);
		const metadata = this.metadata.map(meta => {
			if (objSpec === undefined) return meta;

			return meta.dobj === objSpec.id
				? Object.assign(meta, {
					filename: objSpec.filename,
					specLabel: objSpec.specLabel,
				})
				: meta;
		});
		const datasets = this.datasets.concat([dataset]);
		const firstTimestamp = datasets.reduce((ts, ds) => Math.min(ts, ds.firstTimestamp), Date.now());
		const lastTimestamp = datasets.reduce((ts, ds) => Math.max(ts, ds.lastTimestamp), 0);

		return new Stats(this._timePeriod, this.params, metadata, datasets, firstTimestamp, lastTimestamp);
	}
}

class Dataset {
	constructor(dataLevel, binTable, objSpec){
		this.dataLevel = dataLevel;
		this.binTable = binTable;
		this.nRows = objSpec ? objSpec.nRows : 0;
	}

	get firstTimestamp(){
		return this.binTable === undefined ? Infinity : this.binTable.row(0)[0];
	}

	get lastTimestamp(){
		return this.binTable === undefined ? -Infinity : this.binTable.row(this.nRows - 1)[0];
	}
}
