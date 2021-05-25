import React, { Component, RefObject } from 'react';
import ReactDOM from 'react-dom';
import { DatePickerInput } from 'rc-datepicker';
import FilterTemporal from '../../models/FilterTemporal';
import { Obj } from '../../../../common/main/types';

type Props = {
	marginTop?: number
	filterTemporal: FilterTemporal
	setFilterTemporal: (filterTemporal: FilterTemporal) => void
	category: 'dataTime' | 'submission'
	header: string
}

type State = {
	fromInvalid: boolean
	toInvalid: boolean
} & Obj<boolean>

export default class PickDates extends Component<Props, State> {
	private fromInput: HTMLElement | null = null
	private toInput: HTMLElement | null = null
	private datePickerInputFrom: RefObject<DatePickerInput> | null = null
	private datePickerInputTo: RefObject<DatePickerInput> | null = null
	private onFromKeyUpHandler: (evt: KeyboardEvent) => void
	private onToKeyUpHandler: (evt: KeyboardEvent) => void

	constructor(props: Props){
		super(props);

		this.state = {
			fromInvalid: false,
			toInvalid: false
		};

		this.datePickerInputFrom = React.createRef<DatePickerInput>();
		this.datePickerInputTo = React.createRef<DatePickerInput>();
		this.onFromKeyUpHandler = this.onFromKeyUp.bind(this);
		this.onToKeyUpHandler = this.onToKeyUp.bind(this);
	}

	componentDidMount() {
		if (this.datePickerInputFrom === null || this.datePickerInputTo === null) return;

		// Add handler for emptying date picker input
		this.fromInput = ReactDOM.findDOMNode(this.datePickerInputFrom.current)!.firstChild!.firstChild! as HTMLElement;
		this.toInput = ReactDOM.findDOMNode(this.datePickerInputTo.current)!.firstChild!.firstChild! as HTMLElement;

		this.fromInput.addEventListener('keyup', this.onFromKeyUpHandler);
		this.toInput.addEventListener('keyup', this.onToKeyUpHandler);
	}

	onFromKeyUp(evt: KeyboardEvent){
		if (evt.target && (evt.target as HTMLInputElement).value === '') {
			this.onDateSet('from');
		}
	}

	onToKeyUp(evt: KeyboardEvent) {
		if (evt.target && (evt.target as HTMLInputElement).value === '') {
			this.onDateSet('to');
		}
	}

	componentWillUnmount(){
		this.fromInput!.removeEventListener("keyup", this.onFromKeyUpHandler);
		this.toInput!.removeEventListener("keyup", this.onToKeyUpHandler);
	}

	onDateSet(sender: 'from' | 'to', dateObj?: Date, dateString?: string){
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

		if (newFilter) setFilterTemporal(newFilter);
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
						<div className="col-md-6" style={{minWidth: 160}}>
							<label style={{marginBottom: 0}}>From</label>

							<DatePickerInput
								ref={this.datePickerInputFrom}
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
							<label style={{marginBottom: 0}}>To</label>

							<DatePickerInput
								ref={this.datePickerInputTo}
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

const getClassName = (isInvalid: boolean, error?: string) => {
	return error || isInvalid ? 'cp-dpi-error' : '';
};
