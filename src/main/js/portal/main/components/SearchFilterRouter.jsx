import React, { Component } from 'react';
import ObjSpecFilter from './ObjSpecFilter.jsx';
import Filters from './filters/Filters.jsx';


const defaultTab = 'search';

export default class SearchFilterRouter extends Component {
	constructor(props){
		super(props);

		const selectedTab = props.selectedTab || defaultTab;
		this.tabState = {
			selectedTab,
			searchTabCls: selectedTab === 'search' ? 'active' : '',
			filterTabCls: selectedTab === 'filter' ? 'active' : '',

			setActiveTab: selectedTab => {
				this.tabState.selectedTab = selectedTab || defaultTab;
				this.tabState.searchTabCls = this.tabState.selectedTab === 'search' ? 'active' : '';
				this.tabState.filterTabCls = this.tabState.selectedTab === 'filter' ? 'active' : '';
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
							: <Filters
								filterTemporal={props.filterTemporal}
								setFilterTemporal={props.setFilterTemporal}
								queryMeta={props.queryMeta}
								filterPids={props.filterPids}
								updateFilter={props.updateFilter}
							/>
					}</div>
				</div>
			</div>
		);
	}
}