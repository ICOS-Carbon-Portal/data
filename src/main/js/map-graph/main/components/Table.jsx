import React, { Component, Fragment } from 'react';

export default class Table extends Component{
	constructor(props){
		super(props);

		this.state = {
			valueIdx: undefined,
			pointCount: undefined
		};
	}

	componentDidUpdate(){
		const pointReducer = this.props.pointReducer;
		const {valueIdx, pointCount} = this.state;

		if (pointReducer && valueIdx !== pointReducer.valueIdx && pointCount !== pointReducer.pointCount){
			this.setState({
				valueIdx: pointReducer.valueIdx,
				pointCount: pointReducer.pointCount
			});
		}
	}

	render(){
		const {binTableData, pointReducer, row, isTouchDevice} = this.props;
		const {pointCount} = this.state;

		const dataPointsBboxTxt = binTableData.isValidData && pointCount
			? pointReducer.pointCountInBbox.toLocaleString()
			: '';

		const dataPointsInMapTxt = binTableData.isValidData && pointCount
			? pointReducer.reducedPoints.length.toLocaleString()
			: '';

		return (
			<div style={{fontSize:'85%'}}>
				{isTouchDevice
					? null
					: <table className="table">
						<tbody>
						<TableRows binTableData={binTableData} row={row} />
						</tbody>
					</table>
				}

				{binTableData.isValidData
					? <table className="table">
						<tbody>
							<TableRow header="Data points in bounding box" val={dataPointsBboxTxt} active={false} />
							<TableRow header="Data points shown in map" val={dataPointsInMapTxt} active={false} />
						</tbody>
					</table>
					: null
				}
			</div>
		);
	}
}

const TableRows = ({binTableData, row}) => {
	if (!binTableData.isValidData || row === undefined) return null;

	const dateFormatter = ms => {
		const dateTime = new Date(ms).toISOString().split('T');
		return `${dateTime[0]} ${dateTime[1].substring(0, 5)}`;
	};

	const indices = binTableData.indices;
	const colIndices = [indices.date, indices.latitude, indices.longitude].concat(indices.data);
	const rowData = binTableData.data(colIndices)[row];
	let active = false;

	return (
		<Fragment>{
			rowData.map((val, idx) => {
				active = !active;
				const colInfo = binTableData.column(colIndices[idx]);
				const header = idx <= 2 ? colInfo.label : `${colInfo.label} [${colInfo.unit}]`;
				const title = colInfo.name;
				const valTxt = idx === 0
					? dateFormatter(val)
					: isNaN(val) ? '' : val.toFixed(3);

				return <TableRow key={'tr' + idx} header={header} title={title} val={valTxt} active={active} />;
			})
		}</Fragment>
	);
};

const TableRow = ({header, title, val, active}) => {
	return (
		<tr className={active ? 'active' : ''}>
			<th title={title}>{header}</th>
			<td style={{whiteSpace:'nowrap'}}>{val}</td>
		</tr>
	);
};
