import React, { Component } from 'react';
import {DatePickerInput} from 'rc-datepicker';


export default class PickDates extends Component {
	constructor(props){
		super(props);

		this.state = {
			fromInvalid: false,
			toInvalid: false
		};

		this.fromInput = undefined;
		this.toInput = undefined;
		this.onKeyUpHandler = this.onKeyUp.bind(this);
	}

	componentDidMount(){
		// Add handler for emptying date picker input
		const datePickerInputFrom = this.datePickerInputFrom;
		const datePickerInputTo = this.datePickerInputTo;

		this.fromInput = datePickerInputFrom.getDatePickerInput().firstChild.firstChild;
		this.toInput = datePickerInputTo.getDatePickerInput().firstChild.firstChild;

		this.fromInput.setAttribute('sender', 'from');
		this.toInput.setAttribute('sender', 'to');

		this.fromInput.addEventListener('keyup', this.onKeyUpHandler);
		this.toInput.addEventListener('keyup', this.onKeyUpHandler);
	}

	onKeyUp(evt){
		if (evt.target.value === '') {
			this.onDateSet(evt.target.getAttribute('sender'));
		}
	}

	componentWillUnmount(){
		this.fromInput.removeEventListener("keyup", this.onKeyUpHandler);
		this.toInput.removeEventListener("keyup", this.onKeyUpHandler);
	}

	onDateSet(sender, dateObj, dateString){
		if (dateString === 'Invalid date') {
			this.setState({[sender + 'Invalid']: true});
			return;
		} else if (this.state[sender + 'Invalid']) {
			this.setState({[sender + 'Invalid']: false});
		}

		// Set time to midnight
		const selectedDate = dateString === undefined ? undefined : new Date(dateString);
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

		if (newFilter && setFilterTemporal) setFilterTemporal(newFilter);
	}

	render(){
		const {fromInvalid, toInvalid} = this.state;
		const {category, filterTemporal, header, marginTop} = this.props;
		const from = filterTemporal[category].from;
		const to = filterTemporal[category].to;
		const error = filterTemporal[category].error;

		return (
			<div className="row">
				<div className="col-md-12">
					<div className="row" style={marginTop ? {marginTop} : {}}>
						<div className="col-md-12">
							<h4>{header}</h4>
						</div>
					</div>

					<div className="row">
						<div className="col-md-6">
							<label style={{marginBottom: 0}}>From</label>

							<DatePickerInput
								ref={dpi => this.datePickerInputFrom = dpi}
								showOnInputClick={false}
								value={from}
								className={error || fromInvalid ? 'cp-dpi-error' : ''}
								onChange={this.onDateSet.bind(this, 'from')}
								onClear={this.onDateSet.bind(this, 'from')}
								displayFormat="YYYY-MM-DD"
								returnFormat="YYYY-MM-DD"
							/>
						</div>

						<div className="col-md-6">
							<label style={{marginBottom: 0}}>To</label>

							<DatePickerInput
								ref={dpi => this.datePickerInputTo = dpi}
								showOnInputClick={false}
								value={to}
								className={error || toInvalid ? 'cp-dpi-error' : ''}
								onChange={this.onDateSet.bind(this, 'to')}
								onClear={this.onDateSet.bind(this, 'to')}
								displayFormat="YYYY-MM-DD"
								returnFormat="YYYY-MM-DD"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
