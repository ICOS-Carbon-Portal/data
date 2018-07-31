import React, { Component, Fragment } from 'react';

export default class Table extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const {binTableData, reducedPoints, row} = this.props;

		return (
			<Fragment>
				<table className="table">
					<tbody>
					<TableRows binTableData={binTableData} row={row} />
					</tbody>
				</table>

				{binTableData.isValidData
					? <table className="table">
						<tbody>
						<TableRow header="Data points" val={binTableData.nRows.toLocaleString()} active={false} />
						{reducedPoints !== undefined
							? <TableRow header="Points shown in map" val={reducedPoints.length.toLocaleString()} active={false} />
							: null
						}

						</tbody>
					</table>
					: null
				}
			</Fragment>
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
				const valTxt = idx === 0 ? dateFormatter(val) : val.toFixed(3);

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
