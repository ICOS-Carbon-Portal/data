import React, { Component } from 'react';

export default class PickDates extends Component {

	parseDate(dateString) {
		let [year, month, day] = dateString.split('-');
		return new Date(year, month - 1, day);
	}

	onDateSet(sender, date){
		const selectedDate = date === undefined ? undefined : this.parseDate(date);
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
		const minDate = "2017-01-01"
		const now = Date.now()
		const maxDate = new Date(now).toISOString().substring(0, 10);
		const maxFromDate = to ? to.toISOString().substring(0, 10) : maxDate;
		const minToDate = from ? new Date(from.getTime() + 172800000).toISOString().substring(0, 10) : minDate;

		return (
			<div className="row">
				<div className="col-md-12">

					<div className="row">
						<div className="col-2">From</div>
						<div className="col-4">
							<input type="date" name="from" id="from" min={minDate} max={maxFromDate} onChange={date => this.onDateSet('from', date.target.value)} />
						</div>

						<div className="col-2">To</div>
						<div className="col-4">
							<input type="date" name="to" id="to" min={minToDate} max={maxDate} onChange={date => this.onDateSet('to', date.target.value)} />
						</div>
					</div>
				</div>
			</div>
		);
	}
}
