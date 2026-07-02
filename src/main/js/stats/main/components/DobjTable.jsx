import React, { Component } from 'react';
import './styles.css';
import { getRowSwitch } from './TableRow';

const PLACEHOLDER_ROW_COUNT = 10;

const PLACEHOLDER_WIDTH_PATTERNS = [
	['col-8', 'col-6', 'col-3'],
	['col-6', 'col-7', 'col-2'],
	['col-9', 'col-4', 'col-3'],
	['col-7', 'col-5', 'col-4'],
	['col-8', 'col-6', 'col-2'],
];

const PlaceholderRows = ({ colCount }) =>
	Array.from({ length: PLACEHOLDER_ROW_COUNT }, (_, i) => {
		const pattern = PLACEHOLDER_WIDTH_PATTERNS[i % PLACEHOLDER_WIDTH_PATTERNS.length];
		return (
			<tr key={'ph-' + i}>
				{Array.from({ length: colCount }, (_, j) => (
					<td key={j}>
						<span className={`placeholder ${pattern[Math.min(j, pattern.length - 1)]}`} />
					</td>
				))}
			</tr>
		);
	});

export default class DobjTable extends Component {
	constructor(props) {
		super(props);
	}
	
	onFileNameClick(hashId) {
		if (this.props.updateTableWithFilter)
			this.props.updateTableWithFilter('hashId', [hashId]);
	}

	render() {
		const { dataList, paging, requestPage, panelTitle, tableHeaders, disablePaging, hasHashIdFilter, updateTableWithFilter } = this.props;
		const RowSwitch = dataList && dataList.length ? getRowSwitch(dataList[0], updateTableWithFilter) : undefined;

		return (
			<div className="card">
				<Paging
					hasHashIdFilter={hasHashIdFilter}
					disablePaging={disablePaging}
					paging={paging}
					requestPage={requestPage}
					panelTitle={panelTitle}
				/>

				<div className="card-body table-responsive placeholder-glow" style={{ clear: 'both' }}>
					<table className="table">
						<tbody>
							<TableHeaders tableHeaders={tableHeaders} />
							{dataList === undefined
								? <PlaceholderRows colCount={tableHeaders.length} />
								: RowSwitch && dataList.map((stat, idx) => <RowSwitch key={'row-' + idx} dobj={stat} onFileNameClick={this.onFileNameClick.bind(this)} />)
							}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}

const Paging = ({ hasHashIdFilter, disablePaging, paging, requestPage, panelTitle }) => {
	if (hasHashIdFilter) {
		return (
			<div className="card-header">
				<h5 className="card-title">Stats for single data object</h5>
			</div>
		);
	}

	const start = paging.objCount === 0 ? -1 : (paging.page - 1) * paging.pagesize;
	const end = paging.objCount === 0 ? 0 : start + paging.to;

	return (
		<div className="card-header">
			<span className="float-start">
				<h5 style={{display:'inline'}}>{panelTitle} {start + 1} to {end} of {paging.objCount.toLocaleString()}</h5>
			</span>
			{!disablePaging
				? <div className="float-end">
					<StepButton direction="step-backward" enabled={start > 0} onStep={() => requestPage(paging.page - 1)} />
					<StepButton direction="step-forward" enabled={end < paging.objCount} onStep={() => requestPage(paging.page + 1)} />
				</div>
				: null
			}
		</div>
	);
};

const TableHeaders = ({tableHeaders}) => {
	return (
		<tr>{
			tableHeaders.map((txt, i) => <th key={'th' + i}>{txt}</th>)
		}</tr>
	);
};

const StepButton = props => {
	const disabled = !props.enabled;
	const baseStyle = {display: 'inline', paddingLeft: 4, fontSize: '150%'};
	const style = props.enabled
		? Object.assign(baseStyle, {cursor: 'pointer'})
		: Object.assign(baseStyle, {opacity: 0.65});
	// const style = { display: 'inline', cursor: 'pointer', fontSize: '150%', position: 'relative', top: -4, borderWidth: 0, padding: 0, paddingLeft: 4, backgroundColor: 'transparent' };

	return (
		<h5 style={style} onClick={props.onStep} disabled={disabled}>
			<span className={'fas fa-' + props.direction} />
		</h5>
	);
};
