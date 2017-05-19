import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	specLabel: 'Specification',
	level: 'Level',
	format: 'Format',
	colTitle: 'Column name',
	valType: 'Value type',
	qKind: 'Quantity kind',
	unit: 'Unit',
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
		 : `${placeholders[name]} (${data.length})`;

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

		return specTable
			? <div>{colNames.map(name => this.getCtrl(name, specTable))}</div>
			: null;
	}
}

