import React, { Component } from 'react'
import { Provider } from 'react-redux'
import getStore from '../store'
import FootprintContainer from './FootprintContainer.jsx';
import ControlPanelContainer from './ControlPanelContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';


const store = getStore();

export default class Root extends Component {
	render() {
		return <Provider store={store}>
			<div>

				<div className="row">

					<div className="col-md-4">
						<FootprintContainer />
					</div>

					<div className="col-md-8">
						<ControlPanelContainer />
					</div>

				</div>

				<div className="row">
					<div className="col-md-12">
						<GraphsContainer />
					</div>
				</div>

			</div>
		</Provider>;
	}
}

