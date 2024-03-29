import React, { Component } from 'react';
import Multiselect from 'react-widgets/Multiselect';
import 'react-widgets/styles.css';


export default class Filter extends Component {
	constructor(props) {
		super(props);

		this.itemCount = undefined;
		this.state = {
			open: false
		}
	}

	componentDidUpdate(prevProps) {
		if (this.props.value.length !== prevProps.value.length) {
			this.itemCount = this.props.value.length;
		}
	}

	handleSelectionChange(filter, values) {
		this.itemCount = values.length;
		this.props.updateTableWithFilter(filter.name, values.map(value => value.id));
		this.setState({ open: false });
	}

	handleToggle(value) {
		const open = this.itemCount === value.length - 1
			? false
			: !this.state.open;

		this.setState({ open });
	}

	render() {
		const { open } = this.state;
		const { placeholder, filter, value, children } = this.props;

		return (
			<div className="row mt-2" key={filter.name}>
				<label className="col-lg-4 col-form-label">{placeholder}</label>
				<div className="col-lg-8">
					{children
						? children
						: <Multiselect
							open={open}
							placeholder={placeholder}
							dataKey="id"
							textField="label"
							data={value == "" ? filter.values.filter(f => f.count > 0) : filter.values}
							value={value}
							filter="contains"
							onChange={this.handleSelectionChange.bind(this, filter)}
							onToggle={this.handleToggle.bind(this, value)}
						/>
					}
				</div>
			</div>
		);
	}
}
