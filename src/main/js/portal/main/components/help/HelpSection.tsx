import React, { Component } from 'react';
import { SlideIn } from '../ui/SlideIn';
import HelpText from './HelpText';
import HelpStorage, { HelpItem } from '../../models/HelpStorage.js';


const closeBtnStyle: React.CSSProperties = {
	float: 'right',
	top: -5,
	fontSize: 26,
	cursor: 'pointer'
};

const panelBodyStyle: React.CSSProperties = {
	width: '100%',
	padding: 10,
	minHeight: 400,
	maxHeight: 600,
	overflowY: 'auto',
	backgroundColor: 'rgba(255, 254, 151, 0.36)'
};

type HelpState = {
	helpItem: HelpItem | undefined,
	isOpen: boolean
}

type HelpProps = {
	width: number,
	helpStorage: HelpStorage,
	onHelpClose(): void
}

export default class HelpSection extends Component<HelpProps, HelpState>{
	constructor(props: HelpProps){
		super(props);

		this.state = {
			helpItem: undefined,
			isOpen: false
		};
	}

	componentWillReceiveProps(nextProps: HelpProps) {
		const helpItem = nextProps.helpStorage.visibleHelpItem;
		if(helpItem) this.setState({helpItem, isOpen: true})
		else this.setState({isOpen: false});
	}

	onCloseBtnClick(){
		this.setState({isOpen: false});
		this.props.onHelpClose();
	}

	render() {
		const {helpItem, isOpen} = this.state;
		const {width} = this.props;

		return (
			<div style={{overflow:'hidden'}}>
				<SlideIn isOpen={isOpen} width={width}>
					<div className="card" style={{marginBottom: 0, width}}>

						<h5 className="card-header">
							{helpItem?.header}
							<span
								title="Close"
								className="fas fa-times-circle"
								style={closeBtnStyle}
								onClick={this.onCloseBtnClick.bind(this)}
							/>
						</h5>

						<div className="card-body" style={panelBodyStyle}>
							<HelpText helpItem={helpItem} />
						</div>
					</div>
				</SlideIn>
			</div>
		);
	}
}
