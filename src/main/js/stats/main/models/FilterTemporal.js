const minDate = new Date(-8640000000000000);
const maxDate = new Date(8640000000000000);

export default class FilterTemporal {
	constructor(fromTo) {
		this._fromTo = fromTo || new FromToDates();
	}

	withFrom(from) {
		const newFilter = new FilterTemporal(this._fromTo.withFrom(from));
		newFilter.validateDateTime();
		return newFilter;
	}

	withTo(to) {
		const newFilter = new FilterTemporal(this._fromTo.withTo(to));
		newFilter.validateDateTime();
		return newFilter;
	}

	get fromTo() {
		return this._fromTo;
	}

	get filter() {
		return {
			from: this._fromTo.error ? undefined : this._fromTo.from,
			fromDateTimeStr: this._fromTo.error ? undefined : this._fromTo.fromDateTimeStr,
			to: this._fromTo.error ? undefined : this._fromTo.to,
			toDateTimeStr: this._fromTo.error ? undefined : this._fromTo.toDateTimeStr
		};
	}

	get hasFilter() {
		return !!this._fromTo.from || !!this._fromTo.to;
	}

	validateDateTime() {
		const error = this.isValid(this._fromTo)
			? undefined
			: "Invalid Data sample dates. 'From' date must be before 'To' date";
		this._fromTo.setError(error);
	}

	isValid(fromToDates) {
		const from = fromToDates.from || minDate;
		const to = fromToDates.to || maxDate;

		return from.getTime() < to.getTime();
	}
}

export class FromToDates {
	constructor(from, to, error) {
		this._from = createDate(from);
		this._to = createDate(to);
		this._error = error;
	}

	withFrom(from) {
		return new FromToDates(from, this._to, this._error);
	}

	withTo(to) {
		return new FromToDates(this._from, to, this._error);
	}

	setError(err) {
		this._error = err;
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

	get error() {
		return this._error;
	}
}

const createDate = (potentialDate) => {
	if (potentialDate === undefined) return undefined;

	return potentialDate instanceof Date
		? potentialDate
		: new Date(potentialDate);
};
