import React, { Component } from 'react';
import ObjSpecFilter from './ObjSpecFilter.jsx';
import Filters from './filters/Filters.jsx';

export default class SearchFilterRouter extends Component {
	constructor(props){
		super(props);

		this.tabState = {
			selectedTab: props.selectedTab,
			searchTabCls: 'active',
			filterTabCls: '',
			setActiveTab: selectedTab => {
				this.tabState.selectedTab = selectedTab;

				if (selectedTab === 'search' || selectedTab === 'filter'){
					this.tabState.searchTabCls = selectedTab === 'search' ? 'active' : '';
					this.tabState.filterTabCls = selectedTab === 'filter' ? 'active' : '';
				} else {
					this.tabState.searchTabCls = 'active';
					this.tabState.filterTabCls = '';
				}
			}
		};
	}

	componentWillUpdate(nextProps){
		this.tabState.setActiveTab(nextProps.selectedTab);
	}

	onTabClick(newTab){
		if (this.props.switchTab) this.props.switchTab(newTab);
	}

	render(){
		const props = this.props;
		const tabState = this.tabState;
		const border = '1px solid #ddd';
		const tabContentStyle = {
			borderLeft: border,
			borderRight: border,
			borderBottom: border,
			borderBottomLeftRadius: 4,
			borderBottomRightRadius: 4,
			padding: 10
		};

		// console.log({props, tabState});

		return (
			<div>
				<ul className="nav nav-tabs">
					<li className={tabState.searchTabCls}>
						<a style={{cursor:'pointer'}} onClick={this.onTabClick.bind(this, 'search')}>Search by categories</a>
					</li>
					<li className={tabState.filterTabCls}>
						<a style={{cursor:'pointer'}} onClick={this.onTabClick.bind(this, 'filter')}>Filters</a>
					</li>
				</ul>

				<div className="tab-content" style={tabContentStyle}>
					<div className="tab-pane active">{
						tabState.selectedTab === 'search'
							? <ObjSpecFilter {...props} />
							: <Filters filterTemporal={props.filterTemporal} setFilterTemporal={props.setFilterTemporal} />
					}</div>
				</div>
			</div>
		);
	}
}