import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import ReactDatePicker from 'react-pikaday';
import { TemporalFilter, EmptyFilter } from '../models/Filters';

class DatePicker extends Component {
	constructor(props){
		
		super(props)
			
		this.state = makeInitialState(this.props);	
	}
	
	componentWillReceiveProps(nextProps){
		this.setState(makeInitialState(nextProps));
	}
		
	resetHandler(){
		this.props.filterUpdate(this.props.prop, new EmptyFilter());
	}
	
	handleChange() {
		let dateStr = ReactDOM.findDOMNode(this.refs.datePicker).value;
		let hours = ReactDOM.findDOMNode(this.refs.hoursPicker).value;
		let minutes = ReactDOM.findDOMNode(this.refs.minutesPicker).value;

		let date = new Date(dateStr);
		date.setHours(hours);
		date.setMinutes(minutes);
		
		if (date > this.state.min && date < this.state.max) {
			const filter = new TemporalFilter(this.props.prop, date.toISOString());
			this.props.filterUpdate(this.props.prop, filter);
		} else {
			this.setState({
				date,
			    hours,
			    minutes,
				error: `Min date is ${this.state.min} and max date is ${this.state.max}`
			});
		}
		
	}
	
	render() {
		
		return <div>
				{
					this.state.error
						? <div className="cp_datepicker_message">Notice!<br />{this.state.error}</div>
						: null
				}
				
				<div className="cp_datepicker_date">
					<ReactDatePicker ref="datePicker" value={ this.state.date } onChange={ this.handleChange.bind(this) } />
				</div>
					
				<div className="cp_datepicker_hours">
					<select ref="hoursPicker" value={ this.state.hours } onChange={ this.handleChange.bind(this) }>
						{
							hoursOptions.map(function(o, i) { 
								return <option key={i} value={i}>{i}</option>; 
							})
						}
					</select>
				</div>
				
				<div className="cp_datepicker_minutes">
					<select ref="minutesPicker" value={ this.state.minutes } onChange={ this.handleChange.bind(this) }>
						{
							minutesOptions.map(function(o, i) { 
								return <option key={i} value={i}>{i}</option>; 
							})
						}
					</select> 
				</div>
				
				<div className="cp_datepicker_reset">
					<button onClick={ this.resetHandler.bind(this) }>Reset</button>
				</div>
					
			</div>;
	}
}

const hoursOptions = getOptions(24);
const minutesOptions = getOptions(60);

function makeInitialState(props){
	let date = new Date(props.date);
	let min = new Date(props.minDate);
	let max = new Date(props.maxDate);
	return {
		date,
		hours: date.getHours(),
		minutes: date.getMinutes(),
		min,
		max,
		error: null
	};
}

function getOptions(total) {
	let options = [];
	for(let i = 0; i < total; i++) {
		options[i] = i;
	}
	return options;
}

export default DatePicker;
