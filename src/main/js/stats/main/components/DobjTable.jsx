import React, { Component } from 'react';
import './styles.css';
import config from '../../../common/main/config';

export default class DobjTable extends Component {
	constructor(props) {
		super(props);
	}
	
	onFileNameClick(hashId) {
		this.props.updateTableWithFilter('hashId', [hashId]);
	}

	render() {
		const { dataList, paging, requestPage, panelTitle, tableHeaders, disablePaging, hasHashIdFilter } = this.props;

		return (
			<div className="panel panel-default">
				<Paging
					hasHashIdFilter={hasHashIdFilter}
					disablePaging={disablePaging}
					paging={paging}
					requestPage={requestPage}
					panelTitle={panelTitle}
				/>

				<div className="panel-body table-responsive" style={{ clear: 'both' }}>
					<table className="table">
						<tbody>
							<TableHeaders tableHeaders={tableHeaders} />
							{
								dataList && dataList.length
									? dataList.map((stat, idx) => <RowSwitch key={'row-' + idx} dobj={stat} onFileNameClick={this.onFileNameClick.bind(this)} />)
									: null
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
			<div className="panel-heading">
				<h3 className="panel-title">Stats for single data object</h3>
			</div>
		);
	}

	const start = paging.objCount === 0 ? -1 : (paging.page - 1) * paging.pagesize;
	const end = paging.objCount === 0 ? 0 : start + paging.to;

	return (
		<div className="panel-heading">
			{!disablePaging
				? <div style={{ float: 'right' }}>
					<StepButton direction="backward" enabled={start > 0} onStep={() => requestPage(paging.page - 1)} />
					<StepButton direction="forward" enabled={end < paging.objCount} onStep={() => requestPage(paging.page + 1)} />
				</div>
				: null
			}
			<h3 className="panel-title">{panelTitle} {start + 1} to {end} of {paging.objCount}</h3>
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

const RowSwitch = ({ dobj, onFileNameClick }) => {
	if (dobj.x && dobj.y) {
		return <RowPreviewTS dobj={dobj}/>;

	} else if (dobj.name && dobj.val && dobj.count) {
		return <RowPreviewPopularTSVals dobj={dobj}/>;

	} else if (dobj.variables) {
		return <RowPreviewNetCDF dobj={dobj}/>;

	} else if (dobj.mapView && dobj.y1 && dobj.y2) {
		return <RowPreviewMapGraph dobj={dobj}/>;

	} else {
		return <RowDownloads dobj={dobj} onFileNameClick={onFileNameClick} />;
	}
};

const RowDownloads = ({ dobj, onFileNameClick }) => {
	const fileName = dobj.fileName || <i>Data object does no longer exist</i>;

	return (
		<tr>
			<td>
				<a style={{ cursor: 'pointer' }} onClick={() => onFileNameClick(dobj.hashId)} title="Show stats only for this data object">{fileName}</a>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	)
};

const RowPreviewTS = ({ dobj }) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Variables on X:</u> {dobj.x}</div>
					<div><u>Variables on Y:</u> {dobj.y}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowPreviewNetCDF = ({dobj}) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Variables:</u> {dobj.variables}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowPreviewMapGraph = ({ dobj }) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Shown in map:</u> {dobj.mapView}</div>
					<div><u>Shown in graph (Y1):</u> {dobj.y1}</div>
					<div><u>Shown in graph (Y2):</u> {dobj.y2}</div>
				</details>
			</td>
			<td><LandingPageLink hashId={dobj.hashId} /></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const RowPreviewPopularTSVals = ({dobj}) => {
	return (
		<tr>
			<td>{dobj.val}</td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const LandingPageLink = ({ hashId }) => {
	return <a href={`${config.cpmetaObjectUri}${hashId}`} target="_blank">{hashId.slice(0, 24)}</a>
};

const StepButton = props => {
	const disabled = !props.enabled;
	const style = Object.assign({ display: 'inline', cursor: 'pointer', fontSize: '150%', position: 'relative', top: -4, borderWidth: 0, padding: 0, paddingLeft: 4, backgroundColor: 'transparent' });

	return (
		<button className="btn btn-default" style={style} onClick={props.onStep} disabled={disabled}>
			<span className={'glyphicon glyphicon-step-' + props.direction}></span>
		</button>
	);
};
