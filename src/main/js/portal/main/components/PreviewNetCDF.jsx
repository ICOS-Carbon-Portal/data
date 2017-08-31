import React, { Component } from 'react';


export default class PreviewNetCDF extends Component{
	constructor(props){
		super(props);

	}

	render(){
		const {preview, iframeSrcChange} = this.props;

		return (
			<div>{preview
				? <div className="panel-body" style={{position: 'relative', width: '100%', height: 600, padding: '20%'}}>
					<NetCDFMap
						self={this}
						id={preview.item.id}
						onLoad={iframeSrcChange}
					/>
				</div>
				: null
			}</div>
		);
	}
}

const NetCDFMap = props => {
	const objId = props.id.split('/').pop();

	return (
		<iframe ref={iframe => self.iframe = iframe} onLoad={props.onLoad}
			style={{border: 'none', position: 'absolute', top: -5, left: 5, width: 'calc(100% - 10px)', height: '100%'}}
			src={`//data.icos-cp.eu/netcdf/${objId}/`}
		/>
	);
};