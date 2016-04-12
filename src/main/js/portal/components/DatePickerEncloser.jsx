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
				    	<div className="panel-heading">Panel heading without title</div>
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
						<div className="panel-heading">Panel heading without title</div>
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

export default DatePickerEncloser;
