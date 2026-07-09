import React, { Component } from 'react';
import './styles.css';
import { getRowSwitch } from './TableRow';

const PlaceholderRows = ({ colCount, rowCount }) => {
	const rows = React.useMemo(() =>
		Array.from({ length: rowCount }, (_, i) => (
			<tr key={'ph-' + i}>
				{Array.from({ length: colCount }, (_, j) => {
					if (j === 0) {
						const pxWidth = Math.floor(Math.random() * 180) + 200; // 200–380px
						return <td key={j}><span className="placeholder" style={{width: `${pxWidth}px`}} /></td>;
					}
					if (j === colCount - 1) {
						const chWidth = rowCount === 1 ? 5 : 5 - Math.round(i * 4 / (rowCount - 1)); // 5ch→1ch: count col, decreasing
						return <td key={j}><span className="placeholder" style={{width: `${chWidth}ch`}} /></td>;
					}
					return <td key={j}><span className="placeholder" style={{width: '200px'}} /></td>;
				})}
			</tr>
		)),
		[colCount, rowCount]
	);
	return rows;
};

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
		const isLoading = dataList === undefined;
		const rowCount = disablePaging ? 5 : paging.pagesize;
		const RowSwitch = dataList && dataList.length ? getRowSwitch(dataList[0], updateTableWithFilter) : undefined;

		return (
			<div className="card">
				<Paging
					isLoading={isLoading}
					hasHashIdFilter={hasHashIdFilter}
					disablePaging={disablePaging}
					paging={paging}
					requestPage={requestPage}
					panelTitle={panelTitle}
				/>

				<div className={`card-body table-responsive${isLoading ? ' placeholder-glow' : ''}`} style={{ clear: 'both' }}>
					<table className="table">
						<tbody>
							<TableHeaders tableHeaders={tableHeaders} />
							{isLoading
								? <PlaceholderRows colCount={tableHeaders.length} rowCount={rowCount} />
								: RowSwitch && dataList.map((stat, idx) => <RowSwitch key={'row-' + idx} dobj={stat} onFileNameClick={this.onFileNameClick.bind(this)} />)
							}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}

const Paging = ({ isLoading, hasHashIdFilter, disablePaging, paging, requestPage, panelTitle }) => {
	if (hasHashIdFilter) {
		return (
			<div className="card-header">
				<h5 className="card-title">Stats for single data object</h5>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="card-header placeholder-glow">
				<h5 className="d-flex align-items-center" style={{gap:'5px'}}>
					{panelTitle}
					<span className="placeholder" style={{width:'1ch'}} />
					to
					<span className="placeholder" style={{width:'3ch'}} />
					of
					<span className="placeholder" style={{width:'6ch'}} />
				</h5>
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
