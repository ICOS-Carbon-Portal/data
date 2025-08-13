import {type TemporalFilterRequest} from "./FilterRequest";
import config from "../config";

export type SerializedFilterTemporal = {df?: string, dt?: string, sf?: string, st?: string};
const defaultMaxSamplingDate = config.features.setMaxSamplingDateToToday ? new Date() : undefined;

export default class FilterTemporal {
	private readonly _dataTime: FromToDates;
	private readonly _submission: FromToDates;

	constructor(dataTime?: FromToDates, submission?: FromToDates) {
		this._dataTime = dataTime ?? new FromToDates(undefined, undefined, defaultMaxSamplingDate);
		this._submission = submission ?? new FromToDates(undefined, undefined, new Date());
	}

	get serialize() {
		const res: SerializedFilterTemporal = {};

		if (this._dataTime.from) {
			res.df = this._dataTime.fromDateStr;
		}
		if (this._dataTime.to) {
			res.dt = this._dataTime.toDateStr;
		}
		if (this._submission.from) {
			res.sf = this._submission.fromDateStr;
		}
		if (this._submission.to) {
			res.st = this._submission.toDateStr;
		}

		return res;
	}

	static deserialize(jsonFilterTemporal: SerializedFilterTemporal) {
		return new FilterTemporal(
			new FromToDates(jsonFilterTemporal.df, jsonFilterTemporal.dt, defaultMaxSamplingDate),
			new FromToDates(jsonFilterTemporal.sf, jsonFilterTemporal.st, new Date())
		);
	}

	withDataTimeFrom(from: PotentialDate) {
		return new FilterTemporal(this._dataTime.withFrom(from), this._submission);
	}

	withDataTimeTo(to: PotentialDate) {
		return new FilterTemporal(this._dataTime.withTo(to), this._submission);
	}

	withSubmissionFrom(from: PotentialDate) {
		return new FilterTemporal(this._dataTime, this._submission.withFrom(from));
	}

	withSubmissionTo(to: PotentialDate) {
		return new FilterTemporal(this._dataTime, this._submission.withTo(to));
	}

	restore(dates?: SerializedFilterTemporal) {
		if (dates === undefined) {
			return this;
		}
		const self = this;

		return Object.keys(dates).reduce<FilterTemporal>((acc, key) => {
			switch (key) {
				case 'df':
					return acc.withDataTimeFrom(new Date(dates[key]!));

				case 'dt':
					return acc.withDataTimeTo(new Date(dates[key]!));

				case 'sf':
					return acc.withSubmissionFrom(new Date(dates[key]!));

				case 'st':
					return acc.withSubmissionTo(new Date(dates[key]!));

				default:
					return self;
			}
		}, self);
	}

	get dataTime() {
		return this._dataTime;
	}

	get submission() {
		return this._submission;
	}

	get filters(): TemporalFilterRequest[] {
		return [
			{
				category: 'dataTime',
				from: this._dataTime.from,
				fromDateTimeStr: this._dataTime.fromDateTimeStr,
				to: this._dataTime.to,
				toDateTimeStr: this._dataTime.toDateTimeStr
			},
			{
				category: 'submission',
				from: this._submission.from,
				fromDateTimeStr: this._submission.fromDateTimeStr,
				to: this._submission.to,
				toDateTimeStr: this._submission.toDateTimeStr
			}
		];
	}

	get hasFilter() {
		return Boolean(this._dataTime.from) || Boolean(this._dataTime.to) || Boolean(this._submission.from) || Boolean(this._submission.to);
	}
}

type PotentialDate = Date | string | undefined;
type FromToDate = Date | undefined;
export class FromToDates {
	private readonly _from: FromToDate;
	private readonly _to: FromToDate;
	private readonly _maxDate?: Date;

	constructor(from?: PotentialDate, to?: PotentialDate, maxDate?: Date) {
		this._from = createDate(from);
		this._to = createDate(to);
		this._maxDate = maxDate;
	}

	withFrom(from: PotentialDate) {
		return new FromToDates(from, this._to, this.maxDate);
	}

	withTo(to: PotentialDate) {
		return new FromToDates(this._from, to, this.maxDate);
	}

	get from() {
		return this._from;
	}

	get fromDateStr() {
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._from ? this._from.toISOString().slice(0, 10) : undefined;
	}

	get fromDateTimeStr() {
		return this._from ? this._from.toISOString() : undefined;
	}

	get to() {
		return this._to;
	}

	get toDateStr() {
		// Jasmine test cannot handle toLocaleDateString('se-SE')
		return this._to ? this._to.toISOString().slice(0, 10) : undefined;
	}

	get toDateTimeStr() {
		return this._to ? this._to.toISOString() : undefined;
	}

	get maxDate() {
		return this._maxDate;
	}
}

const createDate = (potentialDate: PotentialDate) => {
	if (potentialDate === undefined) {
		return undefined;
	}

	return potentialDate instanceof Date
		? potentialDate
		: new Date(potentialDate);
};
