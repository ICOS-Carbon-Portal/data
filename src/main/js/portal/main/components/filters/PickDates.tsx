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
		const maxDate = filterTemporal[category].maxDate;

		return (
			<div className="row">
				<div className="col-md-12">

					<div className="row mt-3">
						<div className="col-6">
							<DatePicker
								className="form-control"
								selected={from}
								onChange={(date) => this.onDateSet('from', Array.isArray(date) ? date[0] : date)}
								selectsStart
								startDate={from}
								endDate={to}
								maxDate={to ?? maxDate}
								calendarStartDay={1}
								dateFormat="yyyy-MM-dd"
								isClearable={true}
								showMonthDropdown
								showYearDropdown
								dropdownMode="select"
								dateFormatCalendar=" "
								placeholderText="From"
								/>
						</div>

						<div className="col-6">
							<DatePicker
								className="form-control"
								selected={to}
								onChange={(date) => this.onDateSet('to', Array.isArray(date) ? date[1] : date)}
								selectsEnd
								startDate={from}
								endDate={to}
								minDate={from}
								maxDate={maxDate}
								calendarStartDay={1}
								dateFormat="yyyy-MM-dd"
								isClearable={true}
								showMonthDropdown
								showYearDropdown
								dropdownMode="select"
								dateFormatCalendar=" "
								placeholderText="To"
								/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
