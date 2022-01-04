export default class FilterTemporal {
	constructor(fromTo) {
		this._fromTo = fromTo || new FromToDates();
	}

	withFrom(from) {
		return new FilterTemporal(this._fromTo.withFrom(from));
	}

	withTo(to) {
		return new FilterTemporal(this._fromTo.withTo(to));
	}

	get fromTo() {
		return this._fromTo;
	}

	get filter() {
		return {
			from: this._fromTo.from,
			fromDateTimeStr: this._fromTo.fromDateTimeStr,
			to: this._fromTo.to,
			toDateTimeStr: this._fromTo.toDateTimeStr
		};
	}

	get hasFilter() {
		return !!this._fromTo.from || !!this._fromTo.to;
	}
}

export class FromToDates {
	constructor(from, to) {
		this._from = createDate(from);
		this._to = createDate(to);
	}

	withFrom(from) {
		return new FromToDates(from, this._to);
	}

	withTo(to) {
		return new FromToDates(this._from, to);
	}

	get from() {
		return this._from;
	}

	get fromDateStr() {
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._from ? this._from.toISOString().substr(0, 10) : undefined;
	}

	get fromDateTimeStr() {
		return this._from ? this._from.toISOString() : undefined;
	}

	get to() {
		return this._to;
	}

	get toDateStr() {
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._to ? this._to.toISOString().substr(0, 10) : undefined;
	}

	get toDateTimeStr() {
		return this._to ? this._to.toISOString() : undefined;
	}
}

const createDate = (potentialDate) => {
	if (potentialDate === undefined) return undefined;

	return potentialDate instanceof Date
		? potentialDate
		: new Date(potentialDate);
};
