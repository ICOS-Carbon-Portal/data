import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

export const placeholders = {
	specification: 'Data types',
	dataLevel: 'Data level',
	format: 'Format',
	stations: 'Stations',
	contributors: 'Contributors',
	submitters: 'Submitters',
	themes: 'Theme',
	dlfrom: 'Download from',
	dataOriginCountries: 'Data origin',
};

export default class Filter extends Component {
	constructor(props) {
		super(props);
		this.state = { value: [] }
	}

	handleSelectionChange(filter, values) {
		this.props.updateTableWithFilter(filter.name, values.map(value => value.id));
	}

	tagItem({ item }) {
		return <span>{item.text}</span>;
	}

	render() {
		const { filters, downloadStats, resetFilters } = this.props;
		const hasHashIdFilter = downloadStats.getFilter("hashId").length > 0;
		const showResetBtn = !!filters;

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					{showResetBtn
						? <ResetBtn resetFiltersAction={() => resetFilters()} />
						: null
					}
					<h3 className="panel-title">Data object specification filter</h3>
				</div>
				<div className="panel-body">
					<PanelBody
						hasHashIdFilter={hasHashIdFilter}
						filters={filters}
						downloadStats={downloadStats}
						handleSelectionChange={this.handleSelectionChange}
						self={this}
					/>
				</div>
			</div>
		)
	}
}

const PanelBody = ({ hasHashIdFilter, filters, downloadStats, handleSelectionChange, self }) => {
	if (hasHashIdFilter) {
		return (
			<div>You are currently viewing statistics for a single data object. Clear filters to reset page.</div>
		);

	} else if (filters && filters.length) {
		return (
			<div>
				{filters.filter(f => f.values && f.values.length).map((filter, idx) =>
					<Row key={idx} filter={filter} downloadStats={downloadStats} handleSelectionChange={handleSelectionChange} self={self} />
				)}
			</div>
		);
		
	} else {
		return null;
	}
};

const Row = ({ filter, downloadStats, handleSelectionChange, self }) => {
	return (
		<div className="row" key={filter.name} style={{ marginTop: 10, alignItems: 'center' }}>
			<div className="col-md-4">
				<label style={{ marginBottom: 0, lineHeight: '34px' }}>{placeholders[filter.name]}</label>
			</div>
			<div className="col-md-8">
				<Multiselect
					placeholder={placeholders[filter.name]}
					valueField="id"
					textField="label"
					data={filter.values}
					value={downloadStats.getFilter(filter.name)}
					filter="contains"
					onChange={handleSelectionChange.bind(self, filter)}
				/>
			</div>
		</div>
	);
};

const ResetBtn = props => {
	return (
		<div
			className="glyphicon glyphicon-ban-circle"
			style={{display: 'inline', float: 'right', fontSize: '150%', cursor: 'pointer'}}
			title="Clear all filters"
			onClick={props.resetFiltersAction}
		/>
	);
};
