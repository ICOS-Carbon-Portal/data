import React from 'react';
import ObjectTableRow from './ObjectTableRow.jsx';

export default function(props){
	const {paging, requestStep, cart, previewAction, lookup, preview} = props;
	const {offset, limit, objCount} = paging;
	const to = Math.min(offset + limit, objCount);
	const headerStyle = {whiteSpace: 'nowrap', paddingRight: 0};

	return <div className="panel panel-default">
		<div className="panel-heading">
			<h3 style={{display: 'inline'}} className="panel-title">Data objects {offset + 1} to {to} of {objCount}</h3>
			<div style={{display: 'inline', float: 'right'}}>
				<StepButton direction="backward" enabled={offset > 0} onStep={() => requestStep(-1)} />
				<StepButton direction="forward" enabled={to < objCount} onStep={() => requestStep(1)} />
			</div>
		</div>
		<div className="panel-body">
			<div className="table-responsive">
				<table className="table">
					<thead>
						<tr>
							<th style={headerStyle}>Data object<SortButton varName="fileName" {...props}/></th>
							<th style={headerStyle}>Submission time (UTC)<SortButton varName="submTime" {...props}/></th>
							<th style={headerStyle}>Acquisition start (UTC)<SortButton varName="acqStart" {...props}/></th>
							<th style={headerStyle}>Acquisition stop (UTC)<SortButton varName="acqEnd" {...props}/></th>
						</tr>
					</thead>
					<tbody>{
						props.objectsTable.map((objInfo, i) => {
							const isAddedToCart = cart.hasItem(objInfo.dobj);

							return (
								<ObjectTableRow
									lookup={lookup}
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
	</div>;
}

const SortButton = props => {
	const sorting = props.sorting || {};
	const disabled = !sorting.isEnabled;

	const glyphClass = 'glyphicon glyphicon-sort' + (
		(disabled || sorting.varName !== props.varName)
			? ''
			: sorting.ascending
				? '-by-attributes'
				: '-by-attributes-alt'
	);

	const title = disabled ? 'Filter down the amount of objects first, then sort' : 'Sort';

	const sortHandler = props.toggleSort ? props.toggleSort.bind(null, props.varName) : undefined;

	return <button type="button" className="btn btn-default" disabled={disabled}
		title={title} onClick={sortHandler}
		style={{pointerEvents: 'auto', borderWidth: 0, padding: 6}}
		>
		<span className={glyphClass}></span>
	</button>;
};

const StepButton = props => {
	const style = props.enabled ? {} : {opacity: 0.65};
	return <div style={Object.assign({display: 'inline', paddingLeft: 4, cursor: 'pointer', fontSize: '170%', position: 'relative', top: -6}, style)}
		onClick={props.onStep}
		>
		<span className={'glyphicon glyphicon-step-' + props.direction}></span>
	</div>;
};

