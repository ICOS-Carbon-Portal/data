import React, {ChangeEvent, Component} from "react";
import HelpButton from "../../containers/help/HelpButton";
import {FilterNumber} from "../../models/FilterNumbers";
import { numericFilterLabels } from "../../config";
import FilterOperationBtn from "../buttons/FilterOperationBtn";


interface OurProps {
	isEnabled?: boolean
	filterNumber: FilterNumber
	action: (val: FilterNumber) => void
}

interface OurState {
	isValid: boolean
	val?: string
}

export default class NumberFilter extends Component<OurProps, OurState> {
	constructor(props: OurProps){
		super(props);

		this.state = {
			val: undefined,
			isValid: true
		};
	}

	handleChange(ev: ChangeEvent<HTMLInputElement>) {
		const filterNumber = this.props.filterNumber.validate(ev.target.value);

		this.setState({
			isValid: filterNumber.isValid,
			val: filterNumber.txt
		});

		if (filterNumber.isValid) {
			this.props.action(filterNumber);
		}
	}

	resetFilter(){
		const filterNumber = this.props.filterNumber.validate("");
		this.setState({val: "", isValid: true});
		this.props.action(filterNumber);
	}

	componentDidUpdate(prevProps: OurProps){
		if (prevProps.filterNumber.txt !== "" && this.props.filterNumber.txt === "")
			this.setState({val: undefined, isValid: true});
	}

	render() {
		const {isEnabled = true, filterNumber} = this.props;
		if (!isEnabled) return null;

		const {isValid, val} = this.state;
		const style = isValid ? {} : {backgroundColor: '#ebccd1'};
		const value = val ?? filterNumber.txt;

		return (
			<>
				<div className="row" style={{marginTop: 10}}>
					<div className="col d-flex justify-content-between">
						<div>
							<label>{numericFilterLabels[filterNumber.category]}</label>

							<HelpButton name={filterNumber.category}/>
						</div>
	
						<div>
							<FilterOperationBtn
								enabled={value.length > 0}
								title="Reset this filter"
								baseStyle={{fontSize: 16, marginLeft: 12}}
								iconCls="fas fa-times-circle"
								action={this.resetFilter.bind(this)}
							/>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-md-12">
						<input
							type="text"
							className="form-control"
							onChange={this.handleChange.bind(this)}
							disabled={!isEnabled}
							style={style}
							value={value}
						/>
					</div>
				</div>
			</>
		);
	}
};
