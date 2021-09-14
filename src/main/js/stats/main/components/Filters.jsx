import React from 'react';
import Filter from './Filter';
import PickDates from "./PickDates";
import {temporalFilterUpdate} from "../actions";

export const placeholders = {
	specification: 'Data types',
	dataLevel: 'Data level',
	format: 'Format',
	stations: 'Stations',
	contributors: 'Contributors',
	submitters: 'Submitters',
	themes: 'Theme',
	dlfrom: 'Download country',
	dataOriginCountries: 'Data origin',
	dlDates: 'Download dates',
};

export default function Filters({ filters, downloadStats, resetFilters, updateTableWithFilter, temporalFilterUpdate }) {
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
					temporalFilterUpdate={temporalFilterUpdate}
				/>
			</div>
		</div>
	);
}

const PanelBody = ({ hasHashIdFilter, filters, downloadStats, updateTableWithFilter, temporalFilterUpdate }) => {
	if (hasHashIdFilter) {
		return (
			<div>You are currently viewing statistics for a single data object. Clear filters to reset page.</div>
		);

	} else if (filters && filters.length) {
		const temporalFilters = {
			name: 'dlDates',
			values: downloadStats.temporalFilters
		}
		console.log({temporalFilters, filters, downloadStats});

		return (
			<div>
				{filters.filter(f => f.values && f.values.length).map((filter, idx) =>
					<Row key={idx} filter={filter} downloadStats={downloadStats} updateTableWithFilter={updateTableWithFilter} />
				)}
				<Filter placeholder="Download dates" filter={temporalFilters} value={[]}>
					<PickDates filterTemporal={temporalFilters.values} setFilterTemporal={temporalFilterUpdate} />
				</Filter>
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
