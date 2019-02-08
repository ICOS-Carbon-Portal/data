import React, { Component } from 'react';
import Radio from "./Radio.jsx";

export default class PreviewCtrlPanel extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const {radiosPreviewMain, radiosPreviewSub} = this.props;

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">Type of previewed data</h3>
				</div>
				<div className="panel-body">

					{radiosPreviewMain
						? <Radio
							horizontal={false}
							radios={radiosPreviewMain.radios}
							action={radiosPreviewMain.action}
						/>
						: null
					}

					{radiosPreviewSub && radiosPreviewSub.isActive
						? <div style={{marginTop:40}}>
							<label>{radiosPreviewSub.label}</label>
							<Radio
								horizontal={false}
								radios={radiosPreviewSub.radios}
								action={radiosPreviewSub.action}
							/>
						</div>
						: null
					}

				</div>
			</div>
		);
	}
}