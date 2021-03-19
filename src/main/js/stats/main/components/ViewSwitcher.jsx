import React from 'react';
import Filters from './Filters.jsx';
import DobjTable from './DobjTable.jsx';
import Map from './Map.jsx';
import Graph from './Graph.jsx';
import CtrlPanel from './CtrlPanel.jsx';


const defaultTableHeaders = ["File Name", "Landing Page", "Count"];

export const ViewSwitcher = props => {
	switch(props.view.mode){
		case 'downloads':
			return <DownloadsView {...props} />;

		case 'previews':
			return <PreviewsView {...props} />;
		
		case 'pylib':
			return <LibDownloadsView {...props} />;

		default:
			return <DownloadsView {...props} />;
	}
};

const DownloadsView = props => {
	const hasHashIdFilter = props.downloadStats.getFilter("hashId").length > 0;

	return (
		<div className="row">
			<div className="col-md-4">
				<Filters
					filters={props.filters}
					updateTableWithFilter={props.updateTableWithFilter}
					resetFilters={props.resetFilters}
					downloadStats={props.downloadStats}
				/>

				<h4>Downloads from country</h4>
				<Map
					countryStats={props.countryStats}
					countriesTopo={props.countriesTopo}
					statsMap={props.statsMap}
					updateTableWithFilter={props.updateTableWithFilter}
					downloadStats={props.downloadStats}
				/>

				<h4 style={{marginTop:15}}>Downloads per time period</h4>
				<Graph
					style={{width: '100%', height: 300}}
					statsGraph={props.statsGraph}
					radioAction={props.fetchDownloadStatsPerDateUnit}
					downloadStats={props.downloadStats}
					filters={props.filters}
				/>
			</div>
			<div className="col-md-8">
				<DobjTable
					panelTitle="Data objects"
					tableHeaders={defaultTableHeaders}
					dataList={props.downloadStats.stats}
					paging={props.paging}
					requestPage={props.requestPage}
					updateTableWithFilter={props.updateTableWithFilter}
					hasHashIdFilter={hasHashIdFilter}
				/>
			</div>
		</div>
	);
};

const PreviewsView = props => {
	const dataList = props.previewData;
	const [panelTitle, tableHeaders, disablePaging] = props.subRadio && props.subRadio.isActive
		? ["Variables", [props.subRadio.selected.txt, "Count"], true]
		: ["Data objects", defaultTableHeaders, false];
	
	return (
		<div className="row">
			<div className="col-md-4">
				<CtrlPanel
					panelHeader="Type of previewed data"
					mainRadio={props.mainRadio}
					subRadio={props.subRadio}
				/>
			</div>

			<div className="col-md-8">
				<DobjTable
					panelTitle={panelTitle}
					disablePaging={disablePaging}
					tableHeaders={tableHeaders}
					dataList={dataList}
					paging={props.paging}
					requestPage={props.requestPage}
				/>
			</div>
		</div>
	);
};

const LibDownloadsView = props => {
	const dataList = props.variousStats;
	const [panelTitle, tableHeaders, disablePaging] = libDownloadsViewSettings[props.mainRadio.actionTxt];

	return (
		<div className="row">
			<div className="col-md-4">
				<CtrlPanel
					panelHeader="Downloads from python library"
					mainRadio={props.mainRadio}
					subRadio={props.subRadio}
				/>
			</div>

			<div className="col-md-8">
				<DobjTable
					panelTitle={panelTitle}
					disablePaging={disablePaging}
					tableHeaders={tableHeaders}
					dataList={dataList}
					paging={props.paging}
					requestPage={props.requestPage}
				/>
			</div>
		</div>
	);
};

const libDownloadsViewSettings = {
	getLibDownloadsByDobj: ["Data objects", defaultTableHeaders, false],
	getLibDownloadsByCountry: ["Countries", ["Country", "Count"], false],
	getLibDownloadsByVersion: ["Versions", ["Version", "Count"], false]
};
