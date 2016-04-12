import React, { Component } from 'react'
import ReactDatePicker from 'react-date-picker';

class DatePicker extends Component {
	constructor(props){
		super(props)
	}
	
	render() {
		
		return <div className="cp_datepicker">
					
					<div className="cp_datepicker_calendar">
						<ReactDatePicker date={ this.props.date } onChange={ this.props.onChange } minDate={ this.props.minDate } maxDate={ this.props.maxDate } /> 
					</div>
					
					<div className="cp_datepicker_value">
						<input type="text" value={ dateAsIso(this.props.date) } readOnly={ true } />
					</div>
				
			</div>;
	}
}

function dateAsIso(dateString) {
	console.log(dateString)
	let dateObj = new Date(dateString);
	let month = dateObj.getMonth() + 1;
	month = month.toString().length === 1 ? '0' + month.toString() : month.toString(); 
	let date = dateObj.getDate().toString().length === 1 ? '0' + dateObj.getDate() : dateObj.getDate();
	return dateObj.getFullYear() + ' - ' + month + ' - ' + date;
}

export default DatePicker;
