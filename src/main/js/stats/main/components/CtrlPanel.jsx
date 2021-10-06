import React, { Component } from 'react';
import Radio from "./Radio.jsx";

export default class CtrlPanel extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const { mainRadio, subRadio, panelHeader } = this.props;

		return (
			<div className="card">
				<div className="card-header">
					<h5 style={{display:'inline'}} className="card-title">{panelHeader}</h5>
				</div>
				<div className="card-body">

					{mainRadio
						? <Radio
							horizontal={false}
							radios={mainRadio.radios}
							action={mainRadio.action}
						/>
						: null
					}

					{subRadio && subRadio.isActive
						? <>
							<label>{subRadio.label}</label>
							<Radio
								horizontal={false}
								radios={subRadio.radios}
								action={subRadio.action}
							/>
						</>
						: null
					}

				</div>
			</div>
		);
	}
}