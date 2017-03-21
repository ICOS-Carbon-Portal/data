import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import ReactDatePicker from 'react-pikaday';
import { TemporalFilter, EmptyFilter } from '../models/Filters';
import config from '../config';

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

		let date = new Date(dateStr);

		if (date > this.state.min && date < this.state.max) {
			const filter = new TemporalFilter(this.props.prop, date.toISOString());
			this.props.filterUpdate(this.props.prop, filter);
		} else {
			this.setState({
				date,
				error: `Min date is ${this.state.min} and max date is ${this.state.max}`
			});
		}
		
	}
	
	render() {
		const state = this.state;
		const props = this.props;

		const resetBtnCss = function(state, props){
			const refDate = props.prop == config.fromDateProp
				? state.min
				: state.max;

			const selectedDate = state.date;

			return refDate.getTime() == selectedDate.getTime()
				? 'btn btn-default'
				: 'btn btn-primary';
		};

		return <div>
				{
					this.state.error
						? <div className="cp_datepicker_message">Notice!<br />{this.state.error}</div>
						: null
				}
				
				<div className="cp_datepicker_date">
					<ReactDatePicker
						ref="datePicker"
						value={ this.state.date }
						onChange={ this.handleChange.bind(this) }
					/>
				</div>
				
				<div className="cp_datepicker_reset">
					<button className={resetBtnCss(state, props)} onClick={ this.resetHandler.bind(this) }>Reset</button>
				</div>
					
			</div>;
	}
}

function makeInitialState(props){
	let date = new Date(props.date);
	let min = new Date(props.minDate);
	let max = new Date(props.maxDate);
	return {
		date,
		min,
		max,
		error: null
	};
}

export default DatePicker;
