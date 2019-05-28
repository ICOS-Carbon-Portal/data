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
		const {dataset, metadata, params, timePeriod} = this.props;
		const {stationId, valueType, height} = params;
		const start = performance.now();
		const {min, max, mean} = dataset.stats;
		const duration = performance.now() - start;
		console.log({props: this.props, duration, min, max, mean});
		const header = getHeader(timePeriod, stationId, valueType, height, metadata.station, metadata.dataEnd);

		return (
			<div className="panel panel-default" style={style}>

				<div className="panel-heading">
					<h3 className="panel-title">{header}</h3>
				</div>

				<div className="panel-body" style={{padding: '5px 10px'}}>

					<Row>
						<span style={{fontSize:'16pt'}}>{`${round(mean)} ppm mean`}</span>
					</Row>

					<Row>
						<span>{`${round(min)} min`}</span>
						<span style={{float:'right'}}>
							<a href={getPreviewLnk(metadata.dobj, valueType)} target="_blank">Preview</a>
						</span>
					</Row>

					<Row>
						<span>{`${round(max)} max`}</span>
						<span style={{float:'right'}}>
							<a href={getDownloadLnk(metadata.dobj, valueType)} target="_blank">Download</a>
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
						<img src="//static.icos-cp.eu/images/ICOS_ERIC_logo_rgb.svg" style={{height:40}} />
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

const getHeader = (timePeriod, stationId, valueType, height, station, dataEnd) => {
	const dateStr = _ => {
		switch(timePeriod){
			case 'day':
				return dataEnd.toISOString().split('T')[0];

			case 'month':
				const options = { year: 'numeric', month: 'short' };
				return dataEnd.toLocaleDateString('en-EN', options);

			case 'year':
				return dataEnd.getFullYear();
		}
	};

	return (
		<Fragment>
			<a href={station} target="_blank" style={{color:'#337ab7'}}>{stationId}</a>
			<span style={{marginLeft: 10}}>{height}m</span>
			<span style={{marginLeft: 10}}>{valueType}</span>
			<span style={{marginLeft: 10, float:'right'}}>{dateStr()}</span>
		</Fragment>);
};

const Row = ({children}) => {
	return <div style={{marginBottom: 5}}>{children}</div>;
};

const round = val => Math.round(val);

const getPreviewLnk = (dobj, valueType) => {
	const id = dobj.split('/').pop();

	return `https://data.icos-cp.eu/dygraph-light/?objId=${id}&x=TIMESTAMP&type=line&linking=overlap&y=${valueType}`;
};

const getDownloadLnk = dobj => {
	return dobj.replace('/meta.', '/data.');
};
