import React, { Component } from 'react';
import SimpleObjectTableRow from './SearchResultTableRow.jsx';
import Dropdown from '../controls/Dropdown.jsx';
import {StepButton} from '../buttons/StepButton.jsx';


const dropdownLookup = {
	fileName: 'File name',
	size: 'File size',
	timeStart: 'Data start date',
	timeEnd: 'Data end date',
};

export default class SimpleDataObjectsTable extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const {paging, requestStep, cart, previewAction, lookup, preview, showCount, extendedDobjInfo} = props;
		const {offset, limit, objCount} = paging;
		const to = Math.min(offset + limit, objCount);
		const objCountStyle = showCount
			? {display: 'inline'}
			: {display: 'inline', opacity: 0};

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 style={objCountStyle} className="panel-title">Data objects {offset + 1} to {to} of {objCount}</h3>
					<div style={{display: 'inline', float: 'right'}}>
						<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)} />
						<StepButton direction="forward" enabled={to < objCount} onStep={() => requestStep(1)} />
					</div>
				</div>
				<div className="panel-body">

					<Dropdown
						isSorter={true}
						isEnabled={props.sorting.isEnabled}
						selectedItemKey={props.sorting.varName}
						isAscending={props.sorting.ascending}
						itemClickAction={props.toggleSort}
						lookup={dropdownLookup}
					/>

					<div className="table-responsive">
						<table className="table">
							<tbody>{
								props.objectsTable.map((objInfo, i) => {
									const isAddedToCart = cart.hasItem(objInfo.dobj);
									const extendedInfo = extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);

									return (
										<SimpleObjectTableRow
											lookup={lookup}
											extendedInfo={extendedInfo}
											preview={preview}
											previewAction={previewAction}
											objInfo={objInfo}
											isAddedToCart={isAddedToCart}
											addToCart={props.addToCart}
											removeFromCart={props.removeFromCart}
											key={'dobj_' + i}
										/>
									);
								})
							}</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}
}
