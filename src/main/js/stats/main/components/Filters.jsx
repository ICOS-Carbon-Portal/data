import React from 'react';
import Filter from './Filter';
import PickDates from "./PickDates";
import CheckBtn from "./CheckBtn";

export const placeholders = {
	specification: 'Data types',
	project: 'Project',
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

const LOADING_FILTER_NAMES = [
	'specification', 'project', 'dataLevel', 'stations',
	'contributors', 'submitters', 'dlfrom', 'dataOriginCountries'
];

const PanelBody = ({ hasHashIdFilter, filters, downloadStats, updateTableWithFilter, temporalFilterUpdate, grayDownloadFilterUpdate }) => {
	if (!filters || !(filters.length > 0)) {
		return (
			<>
				{LOADING_FILTER_NAMES.map(name => (
					<Filter key={name} placeholder={placeholders[name]} filter={{name}} disabled={true} value={[]} />
				))}
				<Filter placeholder={placeholders.dlDates} filter={{name: 'dlDates'}} value={[]}>
					<div className="row">
						<div className="col-md-12">
							<div className="row mb-3">
								<label className="col-lg-4 col-form-label">From</label>
								<div className="col-lg-8">
									<input className="form-control" type="date" disabled />
								</div>
							</div>
							<div className="row mb-3">
								<label className="col-lg-4 col-form-label">To</label>
								<div className="col-lg-8">
									<input className="form-control" type="date" disabled />
								</div>
							</div>
						</div>
					</div>
				</Filter>
				<Filter placeholder="Search options" filter={{name: 'searchOptions'}} value={[]}>
					<label className="col-form-label">
						<input className="form-check-input" type="checkbox" disabled readOnly />
						<span className="ms-2">Include gray listed IPs</span>
					</label>
				</Filter>
			</>
		);
	}

	const temporalFilters = {
		name: 'dlDates',
		values: downloadStats.temporalFilters
	};

	return (
		<>
			{filters.filter(f => f.values && f.values.length && (!hasHashIdFilter || f.displayFilterForSingleObject)).map((filter, idx) =>
				<Row key={idx} filter={filter} downloadStats={downloadStats} updateTableWithFilter={updateTableWithFilter} />
			)}
			<Filter placeholder="Download dates" filter={temporalFilters} value={[]}>
				<PickDates filterTemporal={temporalFilters.values} setFilterTemporal={temporalFilterUpdate} />
			</Filter>
			<Filter placeholder="Search options" filter="" value={[]}>
				<CheckButton
					name={"includeGrayDl"}
					grayDownloadFilterUpdate={grayDownloadFilterUpdate}
					isChecked={downloadStats.grayDownloadFilter}
					text={'Include gray listed IPs'}
				/>
			</Filter>
		</>
	);
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
		<label className='col-form-label'>
			<CheckBtn grayDownloadFilterUpdate={grayDownloadFilterUpdate} isChecked={isChecked} name={name} />
			<span className='ms-2'>{text}</span>
		</label>
	);
};