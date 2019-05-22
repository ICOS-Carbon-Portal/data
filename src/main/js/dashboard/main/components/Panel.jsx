import React, { Component, Fragment } from 'react';


const style = {
	display: 'inline-block',
	marginRight: 15
};

export default class Panel extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {dataset, metadata, params} = this.props;
		const {stationId, valueType, height} = params;

		return (
			<div className="panel panel-default" style={style}>

				<div className="panel-heading">
					<h3 className="panel-title">{getHeader(stationId, valueType, height, metadata.station, metadata.dataEnd)}</h3>
				</div>

				<div className="panel-body" style={{padding: '5px 10px'}}>

					<Row>
						<span style={{fontSize:'16pt'}}>{`${round(dataset.mean)} ppm mean`}</span>
					</Row>

					<Row>
						<span>{`${round(dataset.min)} min`}</span>
						<span style={{float:'right'}}>
							<a href={getPreviewLnk(metadata.dobj, valueType)} target="_blank">Preview</a>
						</span>
					</Row>

					<Row>
						<span>{`${round(dataset.max)} max`}</span>
						<span style={{float:'right'}}>
							<a href={getDownloadLnk(metadata.dobj, valueType)} target="_blank">Download</a>
						</span>
					</Row>

					<a href="https://www.icos-cp.eu/about-icos-data">
						<img src="//static.icos-cp.eu/images/ICOS_ERIC_logo_rgb.svg" style={{height:40}} />
					</a>

				</div>
			</div>
		);
	}
}

const getHeader = (stationId, valueType, height, station, dataEnd) => {
	return (
		<Fragment>
			<a href={station} target="_blank" style={{color:'#337ab7'}}>{stationId}</a>
			<span style={{marginLeft: 10}}>{height}m</span>
			<span style={{marginLeft: 10}}>{valueType}</span>
			<span style={{marginLeft: 10}}>{dataEnd.toISOString().split('T')[0]}</span>
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
