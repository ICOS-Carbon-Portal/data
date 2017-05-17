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

		this.state = {
			selSpecs: []
		};
	}

	getCtrl(id, specData){
		const data = specData.reduce((acc, curr) => {
			if (curr[id] && acc.indexOf(curr[id]) < 0 && (this.state.selSpecs.length === 0 || this.state.selSpecs.includes(curr.spec))) {
				acc.push(curr[id]);
			}

			return acc;
		}, []);

		return (
			<div className="row" key={id} style={{marginTop: 10}}>
				<div className="col-md-6">
					<Multiselect
						placeholder={`${this.ctrls[id].placeholder} (${data.length})`}
						data={data}
						onChange={this.handleChange.bind(this, id)}
					/>
				</div>
			</div>
		);
	}

	handleChange(id, values){
		this.ctrls[id].values = values;
		const selSpecs = filterSpecs(this.props.specs.specData, this.ctrls);
		this.setState({selSpecs});
	}

	render(){
		const props = this.props;
		console.log({props});

		return (
			<div>
			{props.specs && props.specCount
				? props.specs.vars.map(id => this.getCtrl(id, props.specs.specData))
				: null
			}
			</div>
		);
	}
}

const filterSpecs = (specData, ctrls) => {
	const noFilter = Object.keys(ctrls).reduce((acc, curr) => acc + ctrls[curr].values.length, 0) === 0;

	if (noFilter) {
		return specData.reduce((acc, sd) => {
			acc.push(sd.spec);

			return acc;
		}, []);
	}


	var selSpecs = [];

	Object.keys(ctrls).forEach(ctrlName => {
		const tmp = specData.reduce((a, sd) => {
			// console.log({values: ctrls[ctrlName].values});

			if (ctrls[ctrlName].values.includes(sd[ctrlName]) && a.indexOf(sd.spec) < 0 && selSpecs.indexOf(sd.spec) < 0) {
				console.log("Add spec", sd.spec, sd[ctrlName]);
				a.push(sd.spec);
			}

			return a;
		}, []);

		if (tmp.length) selSpecs = selSpecs.concat(tmp);
	});
console.log({selSpecs});
	return selSpecs;
};
