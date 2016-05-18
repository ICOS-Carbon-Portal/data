import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import {addDataObject, removeDataObject, FETCHED_DATA, REMOVED_DATA} from '../actions';
import {btnClass, btnClassActive, viewIconOpen, viewIconClosed, viewIconWorking} from './DataObjectList.jsx';


class ViewBtn extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentWillReceiveProps(nextProps){
		if (nextProps.status == FETCHED_DATA || nextProps.status == REMOVED_DATA){
			this.setState({
				id: this.state.id,
				working: false
			});
		}
	}

	onViewBtnClick(dataObjectInfo){
		this.setState({
			id: dataObjectInfo.id,
			working: true
		});

		if (dataObjectInfo.view){
			this.props.removeData(dataObjectInfo);
		} else {
			this.props.addData(dataObjectInfo);
		}
	}
	
	render(){
		const props = this.props;
		const rowData = this.props.rowData;
		const state = this.state;

		const viewClasses = getBtnClasses(props.rowData, state);
		// console.log({state, props, viewClasses});
		// if (state && rowData.id == state.id) {
		// 	console.log({ViewBtnRender: props, state, viewClasses});
		// }
		
		return (
			<button className={viewClasses.btn}
					onClick={() => this.onViewBtnClick(rowData)}
					title="Toggle visibility in graph">
				<span className={viewClasses.icon}></span>
			</button>
		);
	}
}

function getBtnClasses(rowData, state){
	if (state && rowData.id == state.id){
		return {
			btn: rowData.view ? btnClassActive : btnClass,
			icon: state.working
				? viewIconWorking
				: rowData.view
					? viewIconOpen
					: viewIconClosed
		};
	} else {
		return {
			btn: rowData.view ? btnClassActive : btnClass,
			icon: rowData.view
				? viewIconOpen
				: viewIconClosed
		};
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		addData(dataObjectInfo){
			dispatch(addDataObject(dataObjectInfo));
		},

		removeData(dataObjectInfo){
			dispatch(removeDataObject(dataObjectInfo));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(ViewBtn);