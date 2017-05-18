import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

export default class InitSearch extends Component {
	constructor(props) {
		super(props);

		this.ctrls = {
			specLabel: {
				placeholder: 'Specification',
				values: []
			},
			level: {
				placeholder: 'Level',
				values: []
			}
			,
			format: {
				placeholder: 'Format',
				values: []
			}
			,
			colTitle: {
				placeholder: 'Column name',
				values: []
			}
			,
			valType: {
				placeholder: 'Value type',
				values: []
			}
			,
			qKind: {
				placeholder: 'Quantity kind',
				values: []
			}
			,
			unit: {
				placeholder: 'Unit',
				values: []
			}
		};
	}

	getCtrl(name, specTable){
		const data = specTable.getDistinctColObjects(name);
		console.log({name, specTable, data});

		return (
			<div className="row" key={name} style={{marginTop: 10}}>
				<div className="col-md-6">
					<Multiselect
						placeholder={`${this.ctrls[name].placeholder} (${data.length})`}
						valueField="id"
						textField="text"
						data={data}
						onChange={this.handleChange.bind(this, name)}
					/>
				</div>
			</div>
		);
	}

	handleChange(name, values){
		this.ctrls[name].values = values;
		const tmp = this.props.specTable.withFilter(name, values);
		console.log({tmp});
	}

	render(){
		const props = this.props;
		console.log({props});

		return (
			<div>
			{props.specTable
				? props.specTable.names.map(name => this.getCtrl(name, props.specTable))
				: null
			}
			</div>
		);
	}
}

// const filterSpecs = (specData, ctrls) => {
// 	const noFilter = Object.keys(ctrls).reduce((acc, curr) => acc + ctrls[curr].values.length, 0) === 0;
//
// 	if (noFilter) {
// 		return specData.reduce((acc, sd) => {
// 			acc.push(sd.spec);
//
// 			return acc;
// 		}, []);
// 	}
//
//
// 	var selSpecs = [];
//
// 	Object.keys(ctrls).forEach(ctrlName => {
// 		const tmp = specData.reduce((a, sd) => {
// 			// console.log({values: ctrls[ctrlName].values});
//
// 			if (ctrls[ctrlName].values.includes(sd[ctrlName]) && a.indexOf(sd.spec) < 0 && selSpecs.indexOf(sd.spec) < 0) {
// 				a.push(sd.spec);
// 			}
//
// 			return a;
// 		}, []);
//
// 		if (tmp.length) selSpecs = selSpecs.concat(tmp);
// 	});
//
// 	return selSpecs;
// };
