import {pad2} from './formatting';

export default class FootprintsRegistry{
	constructor(filenames){
		let dates = filenames.map(datetimeFromFile);
		dates.sort((d1, d2) => d1 - d2);

		let counts = {};
		for(let i = 1; i < dates.length; i++){
			let step = dates[i] - dates[i - 1];
			counts[step] = (counts[step] || 0) + 1;
		}

		let steps = Object.keys(counts);
		steps.sort((s1, s2) => counts[s2] - counts[s1]);

		this._dates = dates;
		this._step = steps[0];
		this._filenameSuffix = filenames[0].substr(17);
	}

	indexRange(dateRange){
		const self = this;
		const dates = this._dates;
		if(!dateRange) return [0, dates.length - 1];

		let idxMin = self.getRelevantFootprint(dateRange[0]);
		let idxMax = self.getRelevantFootprint(dateRange[1]);
		if(dates[idxMin] < dateRange[0]) idxMin++;
		if(dates[idxMax] > dateRange[1]) idxMax--;
		return [idxMin, idxMax];
	}

	getRelevantFootprint(date){ //Date object or millis
		const dates = this._dates;
		const step = this._step;
		const d = typeof date === 'object' ? date.valueOf() : date;

		function improve(left, right){
			if(right == left) return left;
			const dmin = dates[left];
			const dmax = dates[right];
			if(right - left == 1) return (d - dmin > dmax - d) ? right : left;
			if(d <= dmin + step / 2) return left;
			if(d > dmax - step / 2) return right;

			const slope = (right - left) / (dmax - dmin);
			let guess = left + Math.round(slope * (d - dmin));
			if(guess == left || guess == right) guess = Math.round((left + right) / 2);

			return dates[guess] > d ? improve(left, guess) : improve(guess, right);
		}

		return improve(0, dates.length - 1);
	}

	getFootprint(index){
		return {index, date: this._dates[index], filename: this.constructFilename(this._dates[index])};
	}

	ensureRange(startFootprint, range){
		if(startFootprint && range[0] <= startFootprint.date && range[1] >= startFootprint.date) return startFootprint;
		const idx = this.getRelevantFootprint(range[0]/2 + range[1]/2);
		return this.getFootprint(idx);
	}

	constructFilename(date){
		const d = new Date(date);
		return `foot${d.getUTCFullYear()}x${pad2(d.getUTCMonth() + 1)}x${pad2(d.getUTCDate())}x${pad2(d.getUTCHours())}${this._filenameSuffix}`;
	}
}


const fileRegex = /^foot(\d{4})x(\d\d)x(\d\d)x(\d\d)/;

function datetimeFromFile(filename){
	const match = fileRegex.exec(filename);
	const [year, month, day, hour] = [1, 2, 3, 4].map(i => parseInt(match[i]));
	return Date.UTC(year, month - 1, day, hour, 0, 0); //months are zero-based!
}

