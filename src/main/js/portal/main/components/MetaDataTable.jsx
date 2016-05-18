import React, { Component, PropTypes } from 'react';

class MetaDataTable extends React.Component {
	constructor(props) {
		super(props);
	}

	getMetaDataTableData(formats, labels){
		let tableLabels = labels.slice(0);
		tableLabels.splice(0, 1);

		let tableData = [
			{
				label: '',
				values: tableLabels
			}
		];

		formats.forEach((format, idx) => {
			format.forEach(frm => {
				if (tableData.findIndex(td => td.label == frm.label) < 0){
					tableData.push({
						label: frm.label,
						values: new Array(formats.length)
					})
					tableData[tableData.length - 1].values[idx] = frm.value;
				} else {
					const tdIdx = tableData.findIndex(td => td.label == frm.label);
					tableData[tdIdx].values[idx] = frm.value;
				}
			});
		});

		return tableData;
	}

	getTableRow(rowData, i){
		if (rowData.label == 'LANDING PAGE'){
			return (
				<tr key={"lp" + i}>
					<th>{rowData.label}</th>
					{rowData.values.map((value, idx) => {
						return (
							<td key={"lp" + i + idx.toString()}>
								<a href={value} target="_blank">View landing page</a>
							</td>
						);
					})}
				</tr>
			);
		} else {
			return (
				<tr key={"rowL" + i}>
					<th>{rowData.label}</th>
					{rowData.values.map((value, idx) => {
						return (
							<td key={"rowD" + i + idx.toString()}>{value}</td>
						);
					})}
				</tr>
			);
		}
	}

	render(){
		const props = this.props;

		return (
			<table className="table table-striped table-condensed table-bordered">
				<tbody>
				{props.dataObjects.length > 0 && props.dataObjects.filter(dob => dob.view).length > 0
					? this.getMetaDataTableData(
					props.dataObjects.filter(dob => dob.metaData && dob.view).map(dob => dob.metaData.format),
					props.forChart.labels
				).map((rowData, idx) => this.getTableRow(rowData, idx))
					: null
				}
				</tbody>
			</table>
		);
	}
}

export default MetaDataTable;