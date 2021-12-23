import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { DatePickerInput } from 'rc-datepicker';

export default class PickDates extends Component {
	// private fromInput: HTMLElement | null = null
	// private toInput: HTMLElement | null = null
	// private datePickerInputFrom: RefObject<DatePickerInput> | null = null
	// private datePickerInputTo: RefObject<DatePickerInput> | null = null
	// private onFromKeyUpHandler: (evt: KeyboardEvent) => void
	// private onToKeyUpHandler: (evt: KeyboardEvent) => void

	constructor(props){
		super(props);

		this.state = {
			fromInvalid: false,
			toInvalid: false
		};

		this.datePickerInputFrom = React.createRef();
		this.datePickerInputTo = React.createRef();
		this.onFromKeyUpHandler = this.onFromKeyUp.bind(this);
		this.onToKeyUpHandler = this.onToKeyUp.bind(this);
	}

	componentDidMount() {
		if (this.datePickerInputFrom === null || this.datePickerInputTo === null) return;

		// Add handler for emptying date picker input
		this.fromInput = ReactDOM.findDOMNode(this.datePickerInputFrom.current).firstChild.firstChild;
		this.toInput = ReactDOM.findDOMNode(this.datePickerInputTo.current).firstChild.firstChild;

		this.fromInput.addEventListener('keyup', this.onFromKeyUpHandler);
		this.toInput.addEventListener('keyup', this.onToKeyUpHandler);
	}

	onFromKeyUp(evt){
		if (evt.target && (evt.target).value === '') {
			this.onDateSet('from');
		}
	}

	onToKeyUp(evt) {
		if (evt.target && (evt.target).value === '') {
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
		const {filterTemporal, setFilterTemporal} = this.props;
		let newFilter = undefined;

		if (sender === 'from'){
			newFilter = filterTemporal.withFrom(selectedDate);
		} else if (sender === 'to'){
			newFilter = filterTemporal.withTo(selectedDate);
		} else {
			throw new Error('Unknown sender: ' + sender);
		}

		if (newFilter)
			setFilterTemporal(newFilter);
	}

	render(){
		const {fromInvalid, toInvalid} = this.state;
		const {from, to, error} = this.props.filterTemporal;

		return (
			<div className="row">
				<div className="col-md-12">

					<div className="row">
						<div className="col-md-6" style={{minWidth: 160, marginBottom: 5}}>
							<DatePickerInput
								ref={this.datePickerInputFrom}
								placeholder="from"
								showOnInputClick={false}
								value={from}
								className={getClassName(fromInvalid, error)}
								onChange={this.onDateSet.bind(this, 'from')}
								onClear={this.onDateSet.bind(this, 'from')}
								displayFormat="YYYY-MM-DD"
								returnFormat="YYYY-MM-DD"
							/>
						</div>

						<div className="col-md-6" style={{minWidth: 160}}>
							<DatePickerInput
								ref={this.datePickerInputTo}
								placeholder="to"
								showOnInputClick={false}
								value={to}
								className={getClassName(toInvalid, error)}
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

const getClassName = (isInvalid, error) => {
	return error || isInvalid ? 'cp-dpi-error' : '';
};
