import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

export default class InitSearch extends Component {
	constructor(props) {
		super(props);

		this.ctrls = {
			specLabel: {
				placeholder: 'Specification',
				data: [],
				value: undefined,
				minLength: 0
			},
			level: {
				placeholder: 'Level',
				data: [],
				value: undefined,
				minLength: 0
			}
			,
			format: {
				placeholder: 'Format',
				data: [],
				value: undefined,
				minLength: 0
			}
			,
			colTitle: {
				placeholder: 'Column name',
				data: [],
				value: undefined,
				minLength: 0
			}
			,
			valType: {
				placeholder: 'Value type',
				data: [],
				value: undefined,
				minLength: 0
			}
			,
			qKind: {
				placeholder: 'Quantity kind',
				data: [],
				value: undefined,
				minLength: 0
			}
			,
			unit: {
				placeholder: 'Unit',
				data: [],
				value: undefined,
				minLength: 0
			}
		};
	}

	componentWillReceiveProps(nextProps){
		if (nextProps.specs && nextProps.specCount){
			nextProps.specs.vars.forEach(varName => {
				this.ctrls[varName].data = nextProps.specs.specData.reduce((acc, curr) => {
					if (curr[varName] && acc.indexOf(curr[varName]) < 0) acc.push(curr[varName]);
					return acc;
				}, []);
			});
		}

		console.log({ctrls: this.ctrls});
	}

	getCtrl(varName, specData){
		const data = specData.reduce((acc, curr) => {
			if (curr[varName] && acc.indexOf(curr[varName]) < 0) acc.push(curr[varName]);
			return acc;
		}, []);
		// console.log({data});

		return (
			<div className="row" key={varName} style={{marginTop: 10}}>
				<div className="col-md-6">
					<Multiselect
						placeholder={varName}
						data={data}
						onChange={this.handleChange.bind(this, varName)}
					/>
				</div>
			</div>
		);
	}

	handleChange(varName, value){
		console.log({varName, value});
	}

	render(){
		const props = this.props;
		console.log({props});

		return (
			<div>
			{props.specs && props.specCount
				? props.specs.vars.map(varName => this.getCtrl(varName, props.specs.specData))
				: null
			}
			</div>
		);
	}
}
