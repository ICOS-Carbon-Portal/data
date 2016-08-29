import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import StationsMap from '../components/StationsMap.jsx';
import Graphs from '../components/Graphs.jsx';
import {setSelectedYear} from '../actions.js';

class GraphsContainer extends Component {
	constructor(props){
		super(props);
		this.state = {
			years: []
		};
	}

	changeHandler(){
		const props = this.props;
		const ddl = ReactDOM.findDOMNode(this.refs.yearsDdl);

		if (ddl.selectedIndex > 0){
			this.props.yearSelected(ddl.value);
		}
	}

	renderYearDdl(availableYears, selectedYear, selectedStation){
		return (
			availableYears.length > 0
				? <div>
					<label>{selectedStation.name}</label>
					<select ref="yearsDdl" value={selectedYear} className="form-control" onChange={this.changeHandler.bind(this)}>
						<option key="select">Select year</option>
						{
							availableYears.map(year => {
								return <option key={year} value={year}>{year}</option>;
							})
						}</select>
					</div>
				: null
		);
	}

	render() {
		const props = this.props;
		// console.log({props});

		return (
			<div>
				{this.renderYearDdl(props.availableYears, props.selectedYear, props.selectedStation)}
				<Graphs />
			</div>
		);
	}
}

function stateToProps(state){
	return state;
}

function dispatchToProps(dispatch){
	return {
		yearSelected(selectedYear){
			dispatch(setSelectedYear(selectedYear));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(GraphsContainer);

