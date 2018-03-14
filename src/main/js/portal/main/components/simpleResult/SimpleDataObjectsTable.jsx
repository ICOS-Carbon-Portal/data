import React, { Component } from 'react';
import SimpleObjectTableRow from './SimpleObjectTableRow.jsx';
import Dropdown from '../Dropdown.jsx';


const dropdownLookup = {
	// theme: 'Theme',
	// level: 'Data level',
	fileName: 'File name',
	size: 'File size',
	// submTime: 'Submission date',
	timeStart: 'Data start date',
	timeEnd: 'Data end date',
};

export default class SimpleDataObjectsTable extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const {paging, requestStep, cart, previewAction, lookup, preview, hasFilters, extendedDobjInfo} = props;
		const {offset, limit, objCount} = paging;
		const to = Math.min(offset + limit, objCount);
		const objCountStyle = hasFilters
			? {display: 'inline', opacity: 0}
			: {display: 'inline'};

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
									const theme = [(Math.round(Math.random() * 100) % 4)].map(t => {
										if (t === 0) return 'a';
										if (t === 1) return 'e';
										if (t === 2) return 'o';
										if (t === 3) return '?';
									})[0];

									return (
										<SimpleObjectTableRow
											theme={theme}
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

const StepButton = props => {
	const style = props.enabled ? {} : {opacity: 0.65};
	return <div style={Object.assign({display: 'inline', paddingLeft: 4, cursor: 'pointer', fontSize: '170%', position: 'relative', top: -6}, style)}
				onClick={props.onStep}
	>
		<span className={'glyphicon glyphicon-step-' + props.direction}></span>
	</div>;
};
