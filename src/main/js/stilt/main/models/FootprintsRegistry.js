
export default class FootprintsRegistry{
	constructor(filenames){
		const getDate = i => datetimeFromFile(filenames[i]);

		const n = filenames.length
		const minD = getDate(0);
		const step = (getDate(n - 1) - minD) / (n - 1);

		this._filenames = filenames;
		this._minD = minD;
		this._step = step;
	}

	getRelevantFilename(date){
		const millis = date.getUTCMilliseconds();
		const index = Math.floor((millis - this._minD) / this._step) * this._step;
		const n = this._filenames.length - 1;
		const safeIndex = index < 0 ? 0 : index > n ? n : index;
		return this._filenames[safeIndex];
	}
}


const fileRegex = /^foot(\d{4})x(\d\d)x(\d\d)x(\d\d)/;

function datetimeFromFile(filename){
	const match = fileRegex.exec(filename);
	const [year, month, day, hour] = [1, 2, 3, 4].map(i => parseInt(match[i]));
	return Date.UTC(year, month, day, hour);
}

