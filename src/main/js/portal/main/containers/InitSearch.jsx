import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	specLabel: 'Specification',
	level: 'Data level',
	format: 'Format',
	colTitle: 'Column name',
	valType: 'Value type',
	quantityKind: 'Quantity kind',
	quantityUnit: 'Unit',
	submitter: 'Data submitter',
	station: 'Station of origin',
	isIcos: 'ICOS / non-ICOS data'
};

export default class InitSearch extends Component {
	constructor(props) {
		super(props);
		this.state = {
			specTable: props.specTable
		};
	}

	componentWillReceiveProps(props){
		this.setState(props);
	}

	getCtrl(name){
		const data = this.state.specTable
			? this.state.specTable.getDistinctColValues(name)
				.map(text => {return {text};})
			: [];

		const placeholder = data.length == 1
		 ? `${placeholders[name]}: ${data[0].text}`
		 : `${placeholders[name]} (${data.length} items)`;

		return (
			<div className="row" key={name} style={{marginTop: 10}}>
				<div className="col-md-6">
					<Multiselect
						placeholder={placeholder}
						valueField="text"
						textField="text"
						data={data}
						onChange={this.handleChange.bind(this, name)}
					/>
				</div>
			</div>
		);
	}

	handleChange(name, values){
		const specTable = this.state.specTable.withFilter(name, values.map(v => v.text));
		this.setState({specTable});
	}

	render(){
		const specTable = this.state.specTable;
		const colNames = specTable.names.filter(name => !!placeholders[name]);
		const originsTable = specTable.getTable('origins');
		const count = originsTable
			? originsTable.filteredRows.reduce((acc, next) => acc + (next.count || 0), 0)
			: 0;

		return <div className="panel panel-default">
			<div className="panel-heading">
				<h3 className="panel-title">Data object specification search</h3>
			</div>
			<div className="panel-body">
				<div>
					<div className="row">
						<div className="col-md-2"><label>Total object count</label></div>
						<div className="col-md-2"><span className="label label-default">{count}</span></div>
					</div>
					<div>{colNames.map(name => this.getCtrl(name, specTable))}</div>
				</div>
			</div>
		</div>;
	}
}

