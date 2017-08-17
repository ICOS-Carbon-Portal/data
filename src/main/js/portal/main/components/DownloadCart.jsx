import React, { Component } from 'react';
import YesNoView from './YesNoView.jsx';


export default class DownloadCart extends Component {
	constructor(props) {
		super(props);
		this.state = {
			downloadBtnClickedOn: Date.now(),
			yesNoViewClosedOn: 0
		};
	}

	handleDownloadBtnClick(ev){
		if(Date.now() < this.state.downloadBtnClickedOn + 1000) return; //ignore too frequent clicks

		this.mouseClick = ev.nativeEvent;
		this.props.fetchIsBatchDownloadOk();
		this.setState({downloadBtnClickedOn: Date.now()});
	}

	openLoginWindow(){
		window.open("https://cpauth.icos-cp.eu/");
		this.closeYesNoView();
	}

	closeYesNoView(){
		this.setState({yesNoViewClosedOn: Date.now()});
	}

	render(){
		const {downloadBtnClickedOn, yesNoViewClosedOn} = this.state;
		const {batchDownloadStatus, cart} = this.props;
		const showYesNoView = yesNoViewVisible(downloadBtnClickedOn, yesNoViewClosedOn, batchDownloadStatus);
		const showDownloadIframe = downloadIframeVisible(downloadBtnClickedOn, yesNoViewClosedOn, batchDownloadStatus);

		return(
			<div>
				<button className="btn btn-primary" onClick={this.handleDownloadBtnClick.bind(this)} style={{marginBottom: 15}}>
					<span className="glyphicon glyphicon-download-alt"/> Download cart content
				</button>
				{showDownloadIframe
					? <iframe src={downloadURL(cart.pids, cart.name)} style={{display:'none'}}></iframe>
					: null
				}

				<YesNoView
					visible={showYesNoView}
					mouseClick={this.mouseClick}
					title={'Login required'}
					question={'You must be logged in to Carbon Portal and have accepted the license agreement before downloading. Do you want to log in and accept the license agreement?'}
					actionYes={{fn: this.openLoginWindow.bind(this)}}
					actionNo={{fn: this.closeYesNoView.bind(this)}}
				/>
			</div>
		);
	}
}

const downloadURL = (ids, fileName) => {
	return `https://data.icos-cp.eu/objects?ids=["${ids.join('","')}"]&fileName=${fileName}`;
};

const yesNoViewVisible = (downloadBtnClickedOn, yesNoViewClosedOn, batchDownloadStatus) => {
	return batchDownloadStatus.ts > downloadBtnClickedOn && !batchDownloadStatus.isAllowed && yesNoViewClosedOn < batchDownloadStatus.ts;
};

const downloadIframeVisible = (downloadBtnClickedOn, yesNoViewClosedOn, batchDownloadStatus) => {
	return batchDownloadStatus.ts > downloadBtnClickedOn && batchDownloadStatus.isAllowed;
};
