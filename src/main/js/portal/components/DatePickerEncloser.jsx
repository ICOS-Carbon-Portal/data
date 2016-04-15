import React, { Component } from 'react'
import DatePicker from '../components/DatePicker.jsx';

class DatePickerEncloser extends Component {
	constructor(props){
		super(props)
	}
	
	render() {
		
		return <div className="row">
					
				<div className="col-md-6">
				 	<div className="panel panel-default">
				    	<div className="panel-heading">Date from { dateAsIso(this.props.date1) }</div>
				    	<div className="panel-body">
							<DatePicker
								date={ this.props.date1 } 
								onChange={ this.props.onChange1 } 
								minDate={ this.props.minDate } 
								maxDate={ this.props.maxDate } />
						</div>
						<div className="panel-footer"></div>
					</div>
				
				</div>
				
				<div className="col-md-6">
					<div className="panel panel-default">
						<div className="panel-heading">Date to { dateAsIso(this.props.date2) }</div>
				    	<div className="panel-body">
							<DatePicker
								date={ this.props.date2 } 
								onChange={ this.props.onChange2 } 
								minDate={ this.props.minDate } 
								maxDate={ this.props.maxDate } />
						</div>
						<div className="panel-footer"></div>
					</div>
				</div>
				
			</div>;
	}
}

function dateAsIso(dateString) {
	let dateObj = new Date(dateString);
	let month = dateObj.getMonth() + 1;
	month = month.toString().length === 1 ? '0' + month.toString() : month.toString(); 
	let date = dateObj.getDate().toString().length === 1 ? '0' + dateObj.getDate() : dateObj.getDate();
	return dateObj.getFullYear() + ' - ' + month + ' - ' + date;
}

export default DatePickerEncloser;
