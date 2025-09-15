import config from '../config';

const colIdxs = config.columnIndexes;
const emptyMetadata = {
	station: undefined,
	unit: undefined,
	dobjs: []
};

export default class Stats {
	constructor(timePeriod, params = {}, metadata = emptyMetadata, datasets = [], firstTimestamp, lastTimestamp, measurements = []){
		this._timePeriod = timePeriod || 'day'; // day | month | year
		this.params = params;
		this.metadata = metadata;
		this.datasets = datasets;
		this.firstTimestamp = firstTimestamp;
		this.lastTimestamp = lastTimestamp;
		this.measurements = measurements;
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
		if (startStop === undefined || this.datasets.length === 0) {
			return {min: 0, max: 0, mean: 0};
		}

		const getRows = dataset => {
			if (dataset === undefined || dataset.binTable === undefined) return [];

			const columnIndices = Array.from({length: dataset.binTable.nCols}, (_, i) => i);
			return dataset.binTable
				.values(columnIndices, v => v)
				.filter(row =>
					!isNaN(row[colIdxs.val])
					&& row[colIdxs.ts] >= startStop.start && row[colIdxs.ts] <= startStop.stop
					&& (dataset.dataLevel === 1 && row[colIdxs.flag] === 'U' || dataset.dataLevel === 2 && row[colIdxs.flag] === 'O')
				);
		};
		const lvl1Rows = getRows(this.datasets.find(ds => ds.dataLevel === 1));
		const lvl2Rows = getRows(this.datasets.find(ds => ds.dataLevel === 2));

		let idx = 0;
		let idx1 = 0;
		let idx2 = 0;

		let valCount = 0;
		let min = Infinity;
		let max = - Infinity;
		let sum = 0;

		// Merge values from two binTables and give priority to dataLevel 2
		while (idx < (lvl1Rows.length + lvl2Rows.length)){
			const ts1 = lvl1Rows[idx1] ? lvl1Rows[idx1][colIdxs.ts] : Infinity;
			const ts2 = lvl2Rows[idx2] ? lvl2Rows[idx2][colIdxs.ts] : Infinity;
			let currVal = undefined;

			if (ts1 === ts2 && ts2 !== Infinity){
				currVal = lvl2Rows[idx2][colIdxs.val];
				idx1++;
				idx2++;
			} else if (ts1 < ts2 && ts1 !== Infinity){
				currVal = lvl1Rows[idx1][colIdxs.val];
				idx1++;
			} else if (ts1 > ts2 && ts2 !== Infinity) {
				currVal = lvl2Rows[idx2][colIdxs.val];
				idx2++;
			}

			idx++;

			if (currVal !== undefined){
				min = Math.min(min, currVal);
				max = Math.max(max, currVal);
				sum += currVal;
				valCount++;
			}
		}

		return {min, max, mean: (sum / valCount)};
	}

	get isComplete(){
		return this.metadata.dobjs.length > 0 && this.startStop !== undefined && this.datasets.length > 0;
	}

	get error(){
		if (this.datasets.length > 0 && this.metadata.dobjs.length === 0) {
			return 'No data could be found. Check URL.';
		}
	}

	get samplingHeights() {
		return [...new Set(this.measurements.map(m => m.samplingHeight))].sort((a, b) => a - b);
	}

	get columnNames() {
		return [...new Set(this.measurements.map(m => m.columnName))];
	}

	withParams(stationId, valueType, height, showControls){
		return new Stats(this._timePeriod, { stationId, valueType, height, showControls }, this.metadata, this.datasets, this.firstTimestamp, this.lastTimestamp, this.columnNames, this.samplingHeights, this.measurements);
	}

	withMeasurements(measurements){
		const metadata = measurements.length
			? Object.assign({}, this.metadata, {station: measurements[0].station})
			: this.metadata;

		return new Stats(this._timePeriod, this.params, metadata, this.datasets, this.firstTimestamp, this.lastTimestamp, measurements);
	}

	withTimePeriod(timePeriod){
		return new Stats(timePeriod, this.params, this.metadata, this.datasets, this.firstTimestamp, this.lastTimestamp, this.measurements);
	}

	withHeight(height) {
		return new Stats(this._timePeriod, { ...this.params, height: height }, emptyMetadata, [], this.firstTimestamp, this.lastTimestamp, this.measurements);
	}

	withValueType(valueType) {
		return new Stats(this._timePeriod, { ...this.params, valueType: valueType }, emptyMetadata, [], this.firstTimestamp, this.lastTimestamp, this.measurements);
	}

	withData({yCol, binTable, objSpec}){
		const dataset = new Dataset(objSpec.level, binTable, objSpec);
		const metadata = getMetadata(objSpec, this.metadata, yCol);
		const datasets = this.datasets.concat([dataset]);
		const firstTimestamp = datasets.reduce((ts, ds) => Math.min(ts, ds.firstTimestamp), Date.now());
		const lastTimestamp = datasets.reduce((ts, ds) => Math.max(ts, ds.lastTimestamp), 0);

		return new Stats(this._timePeriod, this.params, metadata, datasets, firstTimestamp, lastTimestamp, this.measurements);
	}
}

const getMetadata = (objSpec, metadata, yCol) => {
	if (objSpec === undefined) return metadata;

	const dobjs = metadata.dobjs.concat([objSpec.id]);
	const unitIdx = objSpec.tableFormat.getColumnIndex(yCol);
	const unit = objSpec.tableFormat.columns[unitIdx].unit;

	return Object.assign({}, metadata, {dobjs, unit});
};

class Dataset {
	constructor(dataLevel, binTable, objSpec){
		this.dataLevel = dataLevel;
		this.binTable = binTable;
		this.nRows = objSpec ? objSpec.nRows : 0;
	}

	get firstTimestamp(){
		return this.binTable === undefined ? Infinity : this.binTable.row(0)[colIdxs.ts];
	}

	get lastTimestamp(){
		return this.binTable === undefined ? -Infinity : this.binTable.row(this.nRows - 1)[colIdxs.ts];
	}
}
