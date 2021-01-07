import React from 'react';
import Filter from './Filter';

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

export default function Filters({ filters, downloadStats, resetFilters, updateTableWithFilter }) {
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
					updateTableWithFilter={updateTableWithFilter}
				/>
			</div>
		</div>
	);
}

const PanelBody = ({ hasHashIdFilter, filters, downloadStats, updateTableWithFilter }) => {
	if (hasHashIdFilter) {
		return (
			<div>You are currently viewing statistics for a single data object. Clear filters to reset page.</div>
		);

	} else if (filters && filters.length) {
		return (
			<div>
				{filters.filter(f => f.values && f.values.length).map((filter, idx) =>
					<Row key={idx} filter={filter} downloadStats={downloadStats} updateTableWithFilter={updateTableWithFilter} />
				)}
			</div>
		);

	} else {
		return null;
	}
};

const Row = ({ filter, downloadStats, updateTableWithFilter }) => {
	return (
		<Filter
			placeholder={placeholders[filter.name]}
			filter={filter}
			value={downloadStats.getFilter(filter.name)}
			updateTableWithFilter={updateTableWithFilter}
		/>
	);
};

const ResetBtn = props => {
	return (
		<div
			className="glyphicon glyphicon-ban-circle"
			style={{ display: 'inline', float: 'right', fontSize: '150%', cursor: 'pointer' }}
			title="Clear all filters"
			onClick={props.resetFiltersAction}
		/>
	);
};
