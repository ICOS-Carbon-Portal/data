import React, { Component } from 'react';


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
		const header = getHeader(timePeriod, startStop, stationId, valueType, height, metadata.station);
		const unit = formatUnit(metadata.unit);
		const meanTxt = isNaN(mean)
			? "No data available"
			: `${mean.toFixed(1)} ${unit} mean`;
		const minTxt = min === Infinity
			? "Unknown min"
			: `${Math.round(min)} min`;
		const maxTxt = max === -Infinity
			? "Unknown max"
			: `${Math.round(max)} max`;

		return (
			<div className="card" style={style}>

				<div className="card-header py-1 px-3">
					{header}
				</div>

				<div className="card-body py-1 px-2">

					<Row style={{fontSize:'90%'}}>
						<span>Sampled {getDateStr(timePeriod, startStop)}</span>
					</Row>

					<Row style={{fontSize:'16pt'}}>
						<span>{meanTxt}</span>
					</Row>

					<Row style={{fontSize:'95%'}}>
						<span>{minTxt}</span>
						<span className="float-end">
							<a href={getPreviewLnk(metadata, valueType)} target="_blank">Preview</a>
						</span>
					</Row>

					<Row style={{fontSize:'95%'}}>
						<span>{maxTxt}</span>
						<span className="float-end">
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

					<a href="https://www.icos-cp.eu/about-icos-data" target="_blank">
						<img src="//static.icos-cp.eu/images/Icos_Logo_CMYK_Regular.svg" style={{height:40}} />
					</a>

				</div>
			</div>
		);
	}
}

const Button = ({currTimePeriod, txt, onClick}) => {
	const isActive = currTimePeriod === txt.toLowerCase();
	const baseCls = 'btn btn-outline-secondary';
	const cls = isActive ? `${baseCls} active` : `${baseCls} text-dark bg-white`;
	const event = isActive ? _ => _ : _ => onClick(txt.toLowerCase());

	return <button type="button" className={cls} style={{width:'33%', fontSize: '80%'}} onClick={event}>{txt}</button>;
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
		<>
			<a href={station} target="_blank" style={{color:'#337ab7'}}>{stationId}</a>
			<span style={{marginLeft: 20}} title="Measurement height">{height}m</span>
			<span style={{marginLeft: 20}} title="Measured type">{valueType}</span>
		</>);
};

const Row = ({style, children}) => {
	return <div className="mb-1" style={style}>{children}</div>;
};

const getPreviewLnk = (metadata, valueType) => {
	const ids = metadata.dobjs.map(dobj => dobj.split('/').pop()).join(',');

	return `https://data.icos-cp.eu/dygraph-light/?objId=${ids}&x=TIMESTAMP&type=point&linking=overlap&y=${valueType}`;
};

const getDownloadLnk = metadata => {
	const dobjIds = metadata.dobjs.map(dobj => dobj.split('/').pop() + '');
	const ids = encodeURIComponent(JSON.stringify(dobjIds));
	const fileName = encodeURIComponent('Near realtime data');

	return `https://data.icos-cp.eu/objects?ids=${ids}&fileName=${fileName}`;
};

const formatUnit = unit => {
	switch (unit){
		case 'µmol mol-1':
			return 'ppm';

		case 'nmol mol-1':
			return 'ppb';

		default:
			return unit;
	}
};
