import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import ViewBtn from './ViewBtn.jsx';
import {pinDataObject} from '../actions';

export const btnClass = "btn btn-default btn-xs";
export const btnClassActive = "btn btn-primary btn-xs active";
export const viewIconOpen = "glyphicon glyphicon-eye-open";
export const viewIconClosed = "glyphicon glyphicon-eye-close";

class DataObjectList extends React.Component {
	constructor(props){
		super(props);
	}

	onPinBtnClick(dataObjectInfo){
		this.props.pinData(dataObjectInfo);
	}

	render(){
		const props = this.props;
		const state = this.state;
		// console.log({state: this.state});

		if (props.dataObjects) {
			return (
				<table className="table table-striped table-condensed table-bordered">
					<tbody>
					<tr>
						<th>Data object (sampling points)</th>
					</tr>
					{props.dataObjects.map((rowData, i) => {
						return (
							<tr key={"row" + i}>
								<td>
									<button className={rowData.pinned ? btnClassActive : btnClass}
											onClick={() => this.onPinBtnClick(rowData)}
											title="Pin to save selection">
										<span className="glyphicon glyphicon-pushpin"></span>
									</button>
									<ViewBtn rowData={rowData} />
									<span style={{marginLeft: 7}}>{rowData.fileName} ({rowData.nRows})</span>
								</td>
							</tr>
						);
					})}
					</tbody>
				</table>
			)
		} else {
			return null;
		}
	}
}

function stateToProps(state){
	return Object.assign({}, state);
}

function dispatchToProps(dispatch){
	return {
		pinData(dataObjectInfo){
			dispatch(pinDataObject(dataObjectInfo));
		}
	};
}

export default connect(stateToProps, dispatchToProps)(DataObjectList);