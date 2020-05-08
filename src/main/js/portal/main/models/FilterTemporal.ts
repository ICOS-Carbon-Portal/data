import { TemporalFilterRequest } from "./FilterRequest";

const minDate = new Date(-8640000000000000);
const maxDate = new Date(8640000000000000);

export type SerializedFilterTemporal = {df?: string, dt?: string, sf?: string, st?: string}

export default class FilterTemporal {
	private readonly _dataTime: FromToDates;
	private readonly _submission: FromToDates;

	constructor(dataTime?: FromToDates, submission?: FromToDates){
		this._dataTime = dataTime || new FromToDates();
		this._submission = submission || new FromToDates();
	}

	get serialize(){
		const res: SerializedFilterTemporal = {};

		if (this._dataTime.from) res.df = this._dataTime.fromDateStr;
		if (this._dataTime.to) res.dt = this._dataTime.toDateStr;
		if (this._submission.from) res.sf = this._submission.fromDateStr;
		if (this._submission.to) res.st = this._submission.toDateStr;

		return res;
	}

	static deserialize(jsonFilterTemporal: SerializedFilterTemporal){
		return new FilterTemporal(
			new FromToDates(jsonFilterTemporal.df, jsonFilterTemporal.dt),
			new FromToDates(jsonFilterTemporal.sf, jsonFilterTemporal.st)
		);
	};

	withDataTimeFrom(from: PotentialDate){
		const newFilter = new FilterTemporal(this._dataTime.withFrom(from), this._submission);
		newFilter.validateDataTime();
		return newFilter;
	}

	withDataTimeTo(to: PotentialDate){
		const newFilter = new FilterTemporal(this._dataTime.withTo(to), this._submission);
		newFilter.validateDataTime();
		return newFilter;
	}

	withSubmissionFrom(from: PotentialDate){
		const newFilter = new FilterTemporal(this._dataTime, this._submission.withFrom(from));
		newFilter.validateSubmission();
		return newFilter;
	}

	withSubmissionTo(to: PotentialDate){
		const newFilter = new FilterTemporal(this._dataTime, this._submission.withTo(to));
		newFilter.validateSubmission();
		return newFilter;
	}

	restore(dates?: SerializedFilterTemporal){
		if (dates === undefined) {
			return this;
		} else {
			const self = this;

			return Object.keys(dates).reduce<FilterTemporal>((acc, key) => {
				switch (key){
					case 'df':
						return acc.withDataTimeFrom(new Date(dates[key] as string));

					case 'dt':
						return acc.withDataTimeTo(new Date(dates[key] as string));

					case 'sf':
						return acc.withSubmissionFrom(new Date(dates[key] as string));

					case 'st':
						return acc.withSubmissionTo(new Date(dates[key] as string));

					default:
						return self;
				}
			}, self);
		}
	}

	get dataTime(){
		return this._dataTime;
	}

	get submission(){
		return this._submission;
	}

	get filters(): TemporalFilterRequest[]{
		return [
			{
				category: 'dataTime',
				from: this._dataTime.error ? undefined : this._dataTime.from,
				fromDateTimeStr: this._dataTime.error ? undefined : this._dataTime.fromDateTimeStr,
				to: this._dataTime.error ? undefined : this._dataTime.to,
				toDateTimeStr: this._dataTime.error ? undefined : this._dataTime.toDateTimeStr
			},
			{
				category: 'submission',
				from: this._submission.error ? undefined : this._submission.from,
				fromDateTimeStr: this._submission.error ? undefined : this._submission.fromDateTimeStr,
				to: this._submission.error ? undefined : this._submission.to,
				toDateTimeStr: this._submission.error ? undefined : this._submission.toDateTimeStr
			}
		]
	}

	get hasFilter(){
		return !!this._dataTime.from || !!this._dataTime.to || !!this._submission.from || !!this._submission.to;
	}

	validateDataTime(){
		const error = this.isValid(this._dataTime)
			? undefined
			: "Invalid Data sample dates. 'From' date must be before 'To' date";
		this._dataTime.setError(error);
	}

	validateSubmission(){
		const error = this.isValid(this._submission)
			? undefined
			: "Invalid Submission dates. 'From' date must be before 'To' date";
		this._submission.setError(error);
	}

	isValid(fromToDates: FromToDates){
		const from = fromToDates.from || minDate;
		const to = fromToDates.to || maxDate;

		return from.getTime() <= to.getTime();
	}
}

type PotentialDate = Date | string | undefined;
type FromToDate = Date | undefined;
export class FromToDates {
	private readonly _from: FromToDate;
	private readonly _to: FromToDate;
	private _error?: string;

	constructor(from?: PotentialDate, to?: PotentialDate, error?: string){
		this._from = createDate(from);
		this._to = createDate(to);
		this._error = error;
	}

	withFrom(from: PotentialDate){
		return new FromToDates(from, this._to, this._error);
	}

	withTo(to: PotentialDate){
		return new FromToDates(this._from, to, this._error);
	}

	setError(err?: string){
		this._error = err;
	}

	get from(){
		return this._from;
	}

	get fromDateStr(){
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._from ? this._from.toISOString().substr(0, 10) : undefined;
	}

	get fromDateTimeStr(){
		return this._from ? this._from.toISOString() : undefined;
	}

	get to(){
		return this._to;
	}

	get toDateStr(){
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._to ? this._to.toISOString().substr(0, 10) : undefined;
	}

	get toDateTimeStr(){
		return this._to ? this._to.toISOString() : undefined;
	}

	get error(){
		return this._error;
	}
}

const createDate = (potentialDate: PotentialDate) => {
	if (potentialDate === undefined) return undefined;

	return potentialDate instanceof Date
		? potentialDate
		: new Date(potentialDate);
};
