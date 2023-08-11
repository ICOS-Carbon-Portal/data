import React from 'react';
import Filter from './Filter';
import PickDates from "./PickDates";

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
		<div className="card">
			<div className="card-header">
				<div className="float-start">
					<h5 style={{display:'inline'}}>Data object specification filter</h5>
				</div>
				{showResetBtn
					? <div className="float-end">
						<ResetBtn resetFiltersAction={() => resetFilters()} />
					</div>
					: null
				}

			</div>
			<div className="card-body">
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
	if (filters && filters.length) {
		const temporalFilters = {
			name: 'dlDates',
			values: downloadStats.temporalFilters
		}

		return (
			<>
				{filters.filter(f => f.values && f.values.length && (!hasHashIdFilter || f.displayFilterForSingleObject)).map((filter, idx) =>
					<Row key={idx} filter={filter} downloadStats={downloadStats} updateTableWithFilter={updateTableWithFilter} />
				)}
				<Filter placeholder="Download dates" filter={temporalFilters} value={[]}>
					<PickDates filterTemporal={temporalFilters.values} setFilterTemporal={temporalFilterUpdate} />
				</Filter>
			</>
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
		<h5 style={{ display: 'inline', fontSize: '150%', cursor: 'pointer' }} onClick={props.resetFiltersAction}>
			<span className="fas fa-ban" />
		</h5>
	);
};
