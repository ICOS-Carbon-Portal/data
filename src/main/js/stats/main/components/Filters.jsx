import React from 'react';
import Filter from './Filter';
import PickDates from "./PickDates";
import CheckBtn from "./CheckBtn";

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

export default function Filters({ filters, downloadStats, resetFilters, updateTableWithFilter, temporalFilterUpdate, grayDownloadFilterUpdate }) {
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
					grayDownloadFilterUpdate={grayDownloadFilterUpdate}
				/>
			</div>
		</div>
	);
}

const PanelBody = ({ hasHashIdFilter, filters, downloadStats, updateTableWithFilter, temporalFilterUpdate, grayDownloadFilterUpdate }) => {
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
				<CheckButton
					name={"includeGrayDl"}
					grayDownloadFilterUpdate={grayDownloadFilterUpdate}
					isChecked={downloadStats.grayDownloadFilter}
					text={'Include gray listed IPs'}
				/>
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

const CheckButton = ({name, grayDownloadFilterUpdate, isChecked, text}) => {
	return (
		<div style={{marginTop:15, marginLeft:280}}>
			<label>
				<CheckBtn grayDownloadFilterUpdate={grayDownloadFilterUpdate} isChecked={isChecked} name={name} />
				<span className='ms-2'>{text}</span>
			</label>
		</div>
	);
};