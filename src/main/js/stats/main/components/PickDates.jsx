import React, { Component } from 'react';
import DatePicker from 'react-datepicker';

export default class PickDates extends Component {

	onDateSet(sender, date){
		const selectedDate = date == null ? undefined : date;
		const {filterTemporal, setFilterTemporal} = this.props;
		let newFilter = undefined;

		if (sender === 'from'){
			newFilter = filterTemporal.withFrom(selectedDate);
		} else if (sender === 'to'){
			newFilter = filterTemporal.withTo(selectedDate);
		} else {
			throw new Error('Unknown sender: ' + sender);
		}

		if (newFilter) setFilterTemporal(newFilter);
	}

	render(){
		const {from, to} = this.props.filterTemporal.fromTo;
		const minDate = new Date('2017-01-01T00:00:00');

		return (
			<div className="row">
				<div className="col-md-12">

					<div className="row">
						<div className="col-6">
							<DatePicker
								className="form-control"
								selected={from}
								onChange={(date) => this.onDateSet('from', Array.isArray(date) ? date[0] : date)}
								selectsStart
								startDate={from}
								endDate={to}
								minDate={minDate}
								maxDate={to ?? new Date()}
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
								minDate={from ?? minDate}
								maxDate={new Date()}
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
