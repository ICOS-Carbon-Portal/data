
const minDate = new Date(-8640000000000000);
const maxDate = new Date(8640000000000000);

export default class FilterTemporal {
	constructor(dataTime, submission){
		this._dataTime = dataTime || new FromToDates();
		this._submission = submission || new FromToDates();
	}

	withDataTimeFrom(from){
		const newFilter = new FilterTemporal(this._dataTime.withFrom(from), this._submission);
		newFilter.validateDataTime();
		return newFilter;
	}

	withDataTimeTo(to){
		const newFilter = new FilterTemporal(this._dataTime.withTo(to), this._submission);
		newFilter.validateDataTime();
		return newFilter;
	}

	withSubmissionFrom(from){
		const newFilter = new FilterTemporal(this._dataTime, this._submission.withFrom(from));
		newFilter.validateSubmission();
		return newFilter;
	}

	withSubmissionTo(to){
		const newFilter = new FilterTemporal(this._dataTime, this._submission.withTo(to));
		newFilter.validateSubmission();
		return newFilter;
	}

	get dataTime(){
		return this._dataTime;
	}

	get submission(){
		return this._submission;
	}

	get filters(){
		return [
			{
				category: 'dataTime',
				from: this._dataTime.error ? undefined : this._dataTime.from,
				fromDateStr: this._dataTime.error ? undefined : this._dataTime.fromDateStr,
				to: this._dataTime.error ? undefined : this._dataTime.to,
				toDateStr: this._dataTime.error ? undefined : this._dataTime.toDateStr
			},
			{
				category: 'submission',
				from: this._submission.error ? undefined : this._submission.from,
				fromDateStr: this._submission.error ? undefined : this._submission.fromDateStr,
				to: this._submission.error ? undefined : this._submission.to,
				toDateStr: this._submission.error ? undefined : this._submission.toDateStr
			}
		]
	}

	validateDataTime(){
		this._dataTime.error = this.isValid(this._dataTime)
			? undefined
			: "Invalid Data sample dates. 'From' date must be before 'To' date";
	}

	validateSubmission(){
		this._submission.error = this.isValid(this._submission)
			? undefined
			: "Invalid Submission dates. 'From' date must be before 'To' date";
	}

	isValid(fromToDates){
		const from = fromToDates.from || minDate;
		const to = fromToDates.to || maxDate;

		return from.getTime() <= to.getTime();
	}
}

class FromToDates {
	constructor(from, to){
		this._from = from;
		this._to = to;
		this.error = undefined;
	}

	withFrom(from){
		return new FromToDates(from, this._to, this._error);
	}

	withTo(to){
		return new FromToDates(this._from, to, this._error);
	}

	setError(err){
		this.error = err;
	}

	get from(){
		return this._from;
	}

	get fromDateStr(){
		return this._from ? this._from.toISOString().substr(0, 10) : undefined;
	}

	get to(){
		return this._to;
	}

	get toDateStr(){
		return this._to ? this._to.toISOString().substr(0, 10) : undefined;
	}
}