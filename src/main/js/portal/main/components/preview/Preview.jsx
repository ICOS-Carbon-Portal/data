import React, { Component } from 'react';
import PreviewTimeSerie from './PreviewTimeSerie.jsx';
import PreviewNetCDF from './PreviewNetCDF.jsx';
import CopyValue from '../controls/CopyValue.jsx';
import config from '../../config';
import BackButton from '../buttons/BackButton.jsx';


export default class Preview extends Component {
	constructor(props){
		super(props);

		this.state = {
			iframeSrc: undefined
		};

		this.historyLength = history.length;
		this.srcChangeHandler = this.handleIframeSrcChange.bind(this);
		window.addEventListener('message',this.srcChangeHandler);
	}

	handleIframeSrcChange(event){
		const iframeSrc = event instanceof MessageEvent ? event.data : event.target.src;
		this.setState({iframeSrc});
		this.props.setPreviewUrl(iframeSrc);

		if (history.length > this.historyLength) {
			history.go(-1);
		}
	}

	componentWillUnmount(){
		window.removeEventListener('message', this.srcChangeHandler);
	}

	render(){
		const {preview, backButtonAction} = this.props;

		return (
			<div>
				{preview
					? <div>
						<BackButton action={backButtonAction} previousRoute={'search'}/>

						<div className="panel panel-default">
							<div className="panel-heading">
								<span className="panel-title">
									{preview.items.map(item => {
										return (
											<span key={item.id} style={{marginRight: 10}}>
												<span style={{marginRight: 10}}>
													{item.itemName}
												</span>
												<a href={item.id} title="View metadata" target="_blank">
													<span className="glyphicon glyphicon-info-sign" />
												</a>
											</span>
										);
									})}
								</span>
							</div>

							<div className="panel-body">
								<div className="row">
									<div className="col-md-12">
										<CopyValue
											btnText="Copy preview chart URL"
											copyHelpText="Click to copy preview chart URL to clipboard"
											valToCopy={previewUrl(preview.items[0], preview.type, this.state.iframeSrc)}
										/>
									</div>
								</div>
							</div>

							<PreviewRoute iframeSrcChange={this.handleIframeSrcChange.bind(this)} {...this.props} />

						</div>
					</div>
					: null
				}</div>
		);
	}
}

const PreviewRoute = props => {
	switch (props.preview.type){

		case config.TIMESERIES:
			return <PreviewTimeSerie {...props} />;

		case config.NETCDF:
			return <PreviewNetCDF {...props} />;

		default:
			return (
				<div className="panel-body">
					This type of preview is not yet implemented
				</div>
			);
	}
};

const previewUrl = (item, type, iframeSrc) => {
	switch (type) {

		case config.TIMESERIES:
			return (item && item.getUrlSearchValue('x') && item.getUrlSearchValue('y')) ? iframeSrc : '';

		default:
			return (item) ? iframeSrc : '';
	}
};
