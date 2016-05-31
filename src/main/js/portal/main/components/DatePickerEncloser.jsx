import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import DatePicker from '../components/DatePicker.jsx';

class DatePickerEncloser extends Component {
	constructor(props){
		
		super(props)
			
		this.state = {isClosePanel1: true, isClosePanel2: true}; 
	}
	
	closePanel1() {
		let comp = ReactDOM.findDOMNode(this.refs.panel1);	
		if (this.state.isClosePanel1) {
			comp.style.display = "none";
			this.state.isClosePanel1 = false;
		} else {
			comp.style.display = "block";
			this.state.isClosePanel1 = true;
		}
	}
	
	closePanel2() {
		let comp = ReactDOM.findDOMNode(this.refs.panel2);	
		if (this.state.isClosePanel2) {
			comp.style.display = "none";
			this.state.isClosePanel2 = false;
		} else {
			comp.style.display = "block";
			this.state.isClosePanel2 = true;
		}
	}
	
	render() {
		
		return <div className="cp_datepicker">
					
				<div className="col-md-4">
				 	<div className="panel panel-default">
				    	<div className="panel-heading" onClick={ this.closePanel1.bind(this)}><h4>Date from { dateAsIso(this.props.date1) }</h4></div>
				    	<div ref="panel1" className="panel-body">
							<DatePicker
								date={ this.props.date1 } 
								onChange={ this.props.onChange1 } 
								minDate={ this.props.minDate } 
								maxDate={ this.props.maxDate } />
						</div>
						<div className="panel-footer"></div>
					</div>

					<div className="panel panel-default">
						<div className="panel-heading" onClick={ this.closePanel2.bind(this) }><h4>Date to { dateAsIso(this.props.date2) }</h4></div>
				    	<div ref="panel2" className="panel-body">
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
	return dateObj.getFullYear() + '-' + month + '-' + date;
}

export default DatePickerEncloser;
