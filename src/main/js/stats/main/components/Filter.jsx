import React, { Component } from 'react';
import { Multiselect } from '@icos-cp/multiselect';

const resolveSelection = (filterValues, ids) =>
	ids.map(id => filterValues.find(v => v.id === id) ?? { id, label: id });

export default class Filter extends Component {
	constructor(props) {
		super(props);

		this.state = {
			open: false
		}
	}

	handleSelectionChange(filter, values) {
		this.props.updateTableWithFilter(filter.name, values.map(value => value.id));
		this.setState({ open: false });
	}

	handleToggle(open) {
		this.setState({ open });
	}

	render() {
		const { open } = this.state;
		const { placeholder, filter, value, children, disabled } = this.props;

		return (
			<div className="row mt-2" key={filter.name}>
				<label className="col-lg-4 col-form-label">{placeholder}</label>
				<div className="col-lg-8">
					{children
						? children
						: disabled
							? <Multiselect disabled placeholder={placeholder} data={[]} value={[]} dataKey="id" textField="label" />
							: <Multiselect
								open={open}
								placeholder={placeholder}
								dataKey="id"
								textField="label"
								data={value.length === 0 ? filter.values.filter(f => f.count > 0) : filter.values}
								value={resolveSelection(filter.values, value)}
								filter="contains"
								onChange={this.handleSelectionChange.bind(this, filter)}
								onToggle={this.handleToggle.bind(this)}
							/>
					}
				</div>
			</div>
		);
	}
}
