import React, { Component } from 'react'
import ReactDatePicker from 'react-pikaday';

class DatePicker extends Component {
	constructor(props){
		
		super(props)
			
		this.state = makeInitialState(this.props);
		
	}
	
	componentWillReceiveProps(nextProps){
		this.setState(makeInitialState(nextProps));
	}
		
	resetHandler(){
		this.props.onChange(null);
	}
	
	updateDate(newDate) {
		let anotherDate = new Date(newDate);
		anotherDate.setHours(this.state.hours);
		anotherDate.setMinutes(this.state.minutes);
		
		
		console.log('1 ' +this.state.hours);
		console.log('2 ' +this.state.minutes);
		
		
		this.props.onChange(anotherDate);
	}
	
	handleDateChange(newDate) {
		console.log(arguments);
		this.setState({date: newDate});
		this.updateDate(newDate);
		
	}
	
	handleHourChange(event) {
		this.setState({hours: event.target.value});
	}
	
	handleMinutesChange(event) {
		this.setState({minutes: event.target.value});
	}

	render() {
		
		return <div className="cp_datepicker">
					
					<div className="cp_datepicker_date">
						<ReactDatePicker value={ this.state.date } onChange={ this.handleDateChange.bind(this) } /> 
					</div>
					
					<div className="cp_datepicker_hour">
						<input type="text" value={ this.state.hours } onChange={ this.handleHourChange.bind(this) } /> 
					</div>
					
					<div className="cp_datepicker_minute">
						<input type="text" value={ this.state.minutes } onChange={ this.handleMinutesChange.bind(this) } /> 
					</div>
					
					<div className="cp_datepicker_reset">
						<button onClick={ this.resetHandler.bind(this) }>Reset</button>
					</div>
					
			</div>;
	}
}

function makeInitialState(props){
	let date = new Date(props.date);
	return {
		date,
		hours: date.getHours(),
		minutes: date.getMinutes()
	};
}

export default DatePicker;
