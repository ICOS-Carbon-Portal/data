import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Dygraphs from '../components/Dygraphs.jsx';
import Select from '../components/Select.jsx';
import {setSelectedYear} from '../actions.js';

class GraphsContainer extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const {selectYear, selectedStation, selectedYear} = this.props;

		const availableYears = selectedStation ? selectedStation.years.map(year => year.year) : [];
		const yearValue = selectedYear ? selectedYear.year : null;

		return availableYears.length > 0
			?	<div>
					<label>{selectedStation.name}</label>
					<Select selectValue={selectYear} availableValues={availableYears} value={yearValue} />
					{this.props.obsVsModel ? <Dygraphs data={this.props.obsVsModel} /> : null}
					{this.props.modelComponents ? <Dygraphs data={this.props.modelComponents} /> : null}
				</div>
			: null;
	}
}

function stateToProps(state){
	return state;
}

function dispatchToProps(dispatch){
	return {
		selectYear(year){
			dispatch(setSelectedYear(year));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(GraphsContainer);

