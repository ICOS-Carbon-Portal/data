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
		this.onFromKeyUpHandler = this.onFromKeyUp.bind(this);
		this.onToKeyUpHandler = this.onToKeyUp.bind(this);
	}

	componentDidMount(){
		// Add handler for emptying date picker input
		this.fromInput = this.datePickerInputFrom.getDatePickerInput().firstChild.firstChild;
		this.toInput = this.datePickerInputTo.getDatePickerInput().firstChild.firstChild;

		this.fromInput.addEventListener('keyup', this.onFromKeyUpHandler);
		this.toInput.addEventListener('keyup', this.onToKeyUpHandler);
	}

	onFromKeyUp(evt){
		if (evt.target.value === '') {
			this.onDateSet('from');
		}
	}

	onToKeyUp(evt){
		if (evt.target.value === '') {
			this.onDateSet('to');
		}
	}

	componentWillUnmount(){
		this.fromInput.removeEventListener("keyup", this.onFromKeyUpHandler);
		this.toInput.removeEventListener("keyup", this.onToKeyUpHandler);
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
						<div className="col-md-6" style="min-width: 150px;">
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

						<div className="col-md-6" style="min-width: 150px;">
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
