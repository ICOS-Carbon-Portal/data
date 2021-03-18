import React, { Component } from 'react';
import Radio from "./Radio.jsx";

export default class CtrlPanel extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const { mainRadio, subRadio, panelHeader } = this.props;

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">{panelHeader}</h3>
				</div>
				<div className="panel-body">

					{mainRadio
						? <Radio
							horizontal={false}
							radios={mainRadio.radios}
							action={mainRadio.action}
						/>
						: null
					}

					{subRadio && subRadio.isActive
						? <div style={{ marginTop: 40 }}>
							<label>{subRadio.label}</label>
							<Radio
								horizontal={false}
								radios={subRadio.radios}
								action={subRadio.action}
							/>
						</div>
						: null
					}

				</div>
			</div>
		);
	}
}