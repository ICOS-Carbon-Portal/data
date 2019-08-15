import React, { Component, Fragment } from 'react';


const style = {
	display: 'inline-block',
	marginRight: 15,
	minWidth: 234
};

export default class Panel extends Component {
	constructor(props){
		super(props);
	}

	handleBtnClick(newTimePeriod){
		this.props.switchTimePeriod(newTimePeriod);
	}

	render(){
		const {stats} = this.props;
		if (!stats.isComplete) return null;

		const {metadata, params, timePeriod, startStop} = stats;
		const {stationId, valueType, height} = params;
		const {min, max, mean} = stats.calculatedStats;
		const header = getHeader(timePeriod, startStop, stationId, valueType, height, metadata[0].station);
		const unit = valueType === "co2" ? "ppm" : "ppb";

		return (
			<div className="panel panel-default" style={style}>

				<div className="panel-heading">
					<h3 className="panel-title">{header}</h3>
				</div>

				<div className="panel-body" style={{padding: '5px 10px'}}>

					<Row>
						<span>Sampled {getDateStr(timePeriod, startStop)}</span>
					</Row>

					<Row>
						<span style={{fontSize:'16pt'}}>{`${mean.toFixed(1)} ${unit} mean`}</span>
					</Row>

					<Row>
						<span>{`${Math.round(min)} min`}</span>
						<span style={{float:'right'}}>
							<a href={getPreviewLnk(metadata, valueType)} target="_blank">Preview</a>
						</span>
					</Row>

					<Row>
						<span>{`${Math.round(max)} max`}</span>
						<span style={{float:'right'}}>
							<a href={getDownloadLnk(metadata, valueType)} target="_blank">Download</a>
						</span>
					</Row>

					<Row>
						<div className="btn-group" role="group" style={{width:'100%'}}>
							<Button currTimePeriod={timePeriod} txt="Day" onClick={this.handleBtnClick.bind(this)} />
							<Button currTimePeriod={timePeriod} txt="Month" onClick={this.handleBtnClick.bind(this)} />
							<Button currTimePeriod={timePeriod} txt="Year" onClick={this.handleBtnClick.bind(this)} />
						</div>
					</Row>

					<a href="https://www.icos-cp.eu/about-icos-data">
						<img src="//static.icos-cp.eu/images/Icos_Logo_CMYK_Regular.svg" style={{height:40}} />
					</a>

				</div>
			</div>
		);
	}
}

const Button = ({currTimePeriod, txt, onClick}) => {
	const isActive = currTimePeriod === txt.toLowerCase();
	const cls = isActive
		? "btn btn-default active"
		: "btn btn-default";
	const event = isActive ? _ => _ : _ => onClick(txt.toLowerCase());

	return <button type="button" className={cls} style={{width:'33%'}} onClick={event}>{txt}</button>;
};

const getDateStr = (timePeriod, startStop) => {
	const startTs = new Date(startStop.start);
	const getMonthYearUTC = date => date.toUTCString().substring(8, 16);

	switch(timePeriod){
		case 'day':
			return startTs.toISOString().split('T')[0];

		case 'month':
			const options = { year: 'numeric', month: 'long' };
			return startTs.toLocaleDateString('en-EN', options);

		case 'year':
			const stopTs = new Date(startStop.stop);
			return `${getMonthYearUTC(startTs)} to ${getMonthYearUTC(stopTs)}`
	}
};

const getHeader = (timePeriod, startStop, stationId, valueType, height, station) => {
	return (
		<Fragment>
			<a href={station} target="_blank" style={{color:'#337ab7'}}>{stationId}</a>
			<span style={{marginLeft: 20}} title="Measurement height">{height}m</span>
			<span style={{marginLeft: 20}} title="Measured type">{valueType}</span>
		</Fragment>);
};

const Row = ({children}) => {
	return <div style={{marginBottom: 5}}>{children}</div>;
};

const getPreviewLnk = (metadata, valueType) => {
	const ids = metadata.map(md => md.dobj.split('/').pop()).join(',');

	return `https://data.icos-cp.eu/dygraph-light/?objId=${ids}&x=TIMESTAMP&type=point&linking=overlap&y=${valueType}`;
};

const getDownloadLnk = metadata => {
	const dobjIds = metadata.map(md => md.dobj.split('/').pop() + '');
	const ids = encodeURIComponent(JSON.stringify(dobjIds));
	const fileName = encodeURIComponent('Near realtime data');

	return `https://data.icos-cp.eu/objects?ids=${ids}&fileName=${fileName}`;
};
