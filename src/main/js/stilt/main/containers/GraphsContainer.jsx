import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import Dygraphs from '../components/Dygraphs.jsx';
import {setDateRange} from '../actions.js';
import throttle from '../../../common/main/general/throttle';
import copyprops from '../../../common/main/general/copyprops';

class GraphsContainer extends Component {
	constructor(props){
		super(props);
	}

	render() {
		const {obsVsModel, modelComponents, dateRange} = this.props

		return <div>
			{obsVsModel ? <Dygraphs data={obsVsModel} {...this.props}/> : null}
			{modelComponents ? <Dygraphs data={modelComponents} {...this.props}/> : null}
		</div>;
	}
}

function stateToProps(state){
	return copyprops(state, ['obsVsModel', 'modelComponents', 'dateRange']);
}

function dispatchToProps(dispatch){
	return {
		updateXRange: throttle(range => {
			dispatch(setDateRange(range));
		}, 200)
	};
}

export default connect(stateToProps, dispatchToProps)(GraphsContainer);

