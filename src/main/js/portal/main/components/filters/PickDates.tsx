import React, { Component } from 'react';
import DatePicker from 'react-datepicker';
import FilterTemporal from '../../models/FilterTemporal';
import { DateCategories } from "../../config";

type Props = {
	filterTemporal: FilterTemporal
	setFilterTemporal: (filterTemporal: FilterTemporal) => void
	category: DateCategories
}

export default class PickDates extends Component<Props> {

	onDateSet(sender: 'from' | 'to', date?: Date | null){
		const selectedDate = date == null ? undefined : date;
		const {category, filterTemporal, setFilterTemporal} = this.props;
		let newFilter = undefined;

		if (sender === 'from'){
			newFilter = category === 'dataTime'
				? filterTemporal.withDataTimeFrom(selectedDate)
				: filterTemporal.withSubmissionFrom(selectedDate);
		} else if (sender === 'to'){
			newFilter = category === 'dataTime'
				? filterTemporal.withDataTimeTo(selectedDate)
				: filterTemporal.withSubmissionTo(selectedDate);
		} else {
			throw new Error('Unknown sender category: ' + sender);
		}

		if (newFilter) setFilterTemporal(newFilter);
	}

	render(){
		const {category, filterTemporal} = this.props;
		const from = filterTemporal[category].from;
		const to = filterTemporal[category].to;

		return (
			<div className="row">
				<div className="col-md-12">

					<div className="row">
						<div className="col-6">
							<label>From</label>

							<DatePicker
								className="form-control"
								selected={from}
								onChange={(date) => this.onDateSet('from', Array.isArray(date) ? date[0] : date)}
								selectsStart
								startDate={from}
								endDate={to}
								maxDate={to ?? new Date()}
								calendarStartDay={1}
								dateFormat="yyyy-MM-dd"
								isClearable={true}
								/>
						</div>

						<div className="col-6">
							<label>To</label>

							<DatePicker
								className="form-control"
								selected={to}
								onChange={(date) => this.onDateSet('to', Array.isArray(date) ? date[1] : date)}
								selectsEnd
								startDate={from}
								endDate={to}
								minDate={from}
								maxDate={new Date()}
								calendarStartDay={1}
								dateFormat="yyyy-MM-dd"
								isClearable={true}
								/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
