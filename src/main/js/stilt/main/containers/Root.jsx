import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import getStore from '../store'
import FootprintContainer from './FootprintContainer.jsx';
import ControlPanelContainer from './ControlPanelContainer.jsx';
import GraphsContainer from './GraphsContainer.jsx';


const store = getStore();

export default class Root extends Component {
	constructor(props){
		super(props);
		this.state = {
			footPrintDivWidth: 0
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.calculateWidth.bind(this));
		this.calculateWidth();
	}

	calculateWidth(){
		const footPrintDiv = ReactDOM.findDOMNode(this.refs.footPrintDiv);
		const style = window.getComputedStyle(footPrintDiv);
		const paddingLeft = parseInt(style.paddingLeft.replace("px", ""));
		const paddingRight = parseInt(style.paddingRight.replace("px", ""));
		const footPrintDivWidth = footPrintDiv.getBoundingClientRect().width - paddingLeft - paddingRight;

		this.setState({footPrintDivWidth});
	}

	componentWillUnmount(){
		window.removeEventListener('resize', this.calculateWidth);
	}

	render() {
		return <Provider store={store}>
			<div className="container-fluid">

				<div className="row">

					<div ref="footPrintDiv" className="col-md-3">
						<FootprintContainer divWidth={this.state.footPrintDivWidth}/>
					</div>

					<div className="col-md-9">
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

