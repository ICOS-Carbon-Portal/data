import React, { Component } from 'react';
import SlideIn from '../ui/SlideIn.jsx';
import HelpText from './HelpText.jsx';


const closeBtnStyle = {
	float: 'right',
	top: -5,
	fontSize: 26,
	cursor: 'pointer'
};
const panelBodyStyle = {
	width: '100%',
	padding: 10,
	minHeight: 400,
	maxHeight: 600,
	overflowY: 'auto',
	backgroundColor: 'rgba(255, 254, 151, 0.36)'
};

export default class HelpSection extends Component{
	constructor(props){
		super(props);

		this.state = {
			helpItem: undefined,
			isOpen: false
		};
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.helpStorage.visibleHelpItem === undefined){
			this.setState({
				isOpen: false
			});
		} else {
			this.setState({
				helpItem: nextProps.helpStorage.visibleHelpItem,
				isOpen: true
			});
		}
	}

	onCloseBtnClick(){
		const {helpStorage, getFilterHelpInfo} = this.props;
		getFilterHelpInfo(helpStorage.visibleHelpItem.name);
		this.setState({
			isOpen: !this.state.isOpen
		});
	}

	render() {
		const {helpItem, isOpen} = this.state;
console.log({helpItem});
		const {width} = this.props;
		const header = helpItem ? helpItem.header : undefined;
console.log({header});

		return (
			<div style={{overflow:'hidden'}}>
				<SlideIn isOpen={isOpen} width={width}>
					<div className="panel panel-default" style={{marginBottom: 0, width}}>

						<div className="panel-heading">
							<h3 className="panel-title">
								{header}
								<span
									title="Close"
									className="glyphicon glyphicon-remove-sign text-info"
									style={closeBtnStyle}
									onClick={this.onCloseBtnClick.bind(this)}
								/>
							</h3>
						</div>

						<div className="panel-body" style={panelBodyStyle}>
							<HelpText helpTxtItem={helpItem} />
						</div>
					</div>
				</SlideIn>
			</div>
		);
	}
}
