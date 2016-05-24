import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import {addDataObject, removeDataObject} from '../actions';
import {btnClass, btnClassActive, viewIconOpen, viewIconClosed} from './DataObjectList.jsx';


class ViewBtn extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	onViewBtnClick(dataObjectInfo){
		if (dataObjectInfo.view){
			this.props.removeData(dataObjectInfo);
		} else {
			const useCache = this.props.dataObjects.findIndex(dob =>
					dob.id == dataObjectInfo.id && dob.binTable != null && dob.metaData != null
				) >= 0;
			this.props.addData(dataObjectInfo, useCache);
		}
	}
	
	render(){
		const props = this.props;
		const rowData = this.props.rowData;
		const viewClasses = getBtnClasses(props.rowData);

		return (
			<button className={viewClasses.btn}
					onClick={() => this.onViewBtnClick(rowData)}
					title="Toggle visibility in graph">
				<span className={viewClasses.icon}></span>
			</button>
		);
	}
}

function getBtnClasses(rowData){
	return {
		btn: rowData.view ? btnClassActive : btnClass,
		icon: rowData.view ? viewIconOpen : viewIconClosed
	};
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		addData(dataObjectInfo, useCache){
			dispatch(addDataObject(dataObjectInfo, useCache));
		},

		removeData(dataObjectInfo){
			dispatch(removeDataObject(dataObjectInfo));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(ViewBtn);