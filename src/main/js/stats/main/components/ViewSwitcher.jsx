import React from 'react';
import Filter from './Filter.jsx';
import DobjTable from './DobjTable.jsx';
import Map from './Map.jsx';
import Graph from './Graph.jsx';
import PreviewCtrlPanel from './PreviewCtrlPanel.jsx';


export const ViewSwitcher = props => {
	switch(props.view.mode){
		case 'downloads':
			return <DownloadsView {...props} />;

		case 'previews':
			return <PreviewsView {...props} />;

		default:
			return <DownloadsView {...props} />;
	}
};

const DownloadsView = props => {
	return (
		<div className="row">
			<div className="col-md-4">
				<Filter
					filters={props.filters}
					updateTableWithFilter={props.updateTableWithFilter}
					downloadStats={props.downloadStats}
					fetchDownloadStats={props.fetchDownloadStats}/>

				<h4>Downloads per country</h4>
				<Map
					countryStats={props.countryStats}
					countriesTopo={props.countriesTopo}
					statsMap={props.statsMap}
				/>

				<h4 style={{marginTop:15}}>Downloads per time period</h4>
				<Graph
					style={{width: '100%', height: 300}}
					statsGraph={props.statsGraph}
					radioAction={props.fetchDownloadStatsPerDateUnit}
				/>
			</div>
			<div className="col-md-8">
				<DobjTable
					dataList={props.downloadStats.stats}
					paging={props.paging}
					requestPage={props.requestPage}
				/>
			</div>
		</div>
	);
};

const PreviewsView = props => {
	return (
		<div className="row">
			<div className="col-md-4">
				<PreviewCtrlPanel />
			</div>

			<div className="col-md-8">
				<DobjTable
					dataList={props.previewTimeserie}
					paging={props.paging}
					requestPage={props.requestPage}
				/>
			</div>
		</div>
	);
};
