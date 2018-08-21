import React, { Component } from 'react';
import config from "../../config";


export default class Tabs extends Component{
	constructor(props){
		super(props);

		const selectedTabId = props.selectedTabId || 0;
		this.tabState = props.children.map((child, idx) => {
			return {
				id: idx,
				tabHeader: child.props.tabHeader,
				isActive: idx === selectedTabId
			};
		});
	}

	componentWillUpdate(nextProps){
		this.setActiveTab(nextProps.selectedTabId);
	}

	setActiveTab(tabId = 0){
		this.tabState.forEach(tab => tab.isActive = tab.id === tabId);
	}

	onTabClick(selectedTabId){
		const {tabName, switchTab} = this.props;
		if (tabName && switchTab) switchTab(tabName, selectedTabId);
	}

	render(){
		const {children} = this.props;
		const border = '1px solid #ddd';
		const tabContentStyle = {
			borderLeft: border,
			borderRight: border,
			borderBottom: border,
			borderBottomLeftRadius: 4,
			borderBottomRightRadius: 4,
			padding: 10
		};

		return (
			<div>
				<ul className="nav nav-tabs">{
					this.tabState.map(tab =>
						<li key={'tabHeader' + tab.id} className={tab.isActive ? 'active' : ''}>
							<a style={{cursor:'pointer'}} onClick={this.onTabClick.bind(this, tab.id)}>{
								tab.tabHeader
							}</a>
						</li>
					)
				}</ul>

				<div className="tab-content" style={tabContentStyle}>
					<div className="tab-pane active">{
						children.find((child, idx) => this.tabState[idx].isActive)
					}</div>
				</div>
			</div>
		);
	}
}
