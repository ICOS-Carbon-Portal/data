import React, { Component, ReactNode } from 'react';

type Props = {
	tabName: string
	selectedTabId?: number
	switchTab: (tabName: string, selectedTabId: number) => void
} & { children: ReactNode[] }

type TabState = {
	id: number
	tabHeader: string
	isActive: boolean
}

export default class Tabs extends Component<Props>{
	private tabState: TabState[]

	constructor(props: Props){
		super(props);

		const selectedTabId = props.selectedTabId ?? 0;
		this.tabState = props.children.map((child: any, idx) => (
			{
				id: idx,
				tabHeader: child.props.tabHeader,
				isActive: idx === selectedTabId
			}
		));
	}

	componentWillUpdate(nextProps: Props){
		this.setActiveTab(nextProps.selectedTabId);
	}

	setActiveTab(tabId = 0){
		this.tabState.forEach(tab => tab.isActive = tab.id === tabId);
	}

	onTabClick(selectedTabId: number){
		const {tabName, switchTab} = this.props;
		if (tabName && switchTab) switchTab(tabName, selectedTabId);
	}

	render(){
		const {children} = this.props;
		const border = '1px solid #ddd';
		const tabContentStyle = {
			borderLeft: border,
			borderRight: border,
			borderBottom: border
		};

		return (
			<div className="card">
				<div className="card-header">
					<ul className="nav nav-tabs card-header-tabs">{
						this.tabState.map(tab =>
							<li key={'tabHeader' + tab.id} className={'nav-item'}>
								<a style={{cursor: 'pointer'}} className={tab.isActive ? 'nav-link active' : 'nav-link'} onClick={this.onTabClick.bind(this, tab.id)}>{
									tab.tabHeader
								}</a>
							</li>
						)
					}</ul>
				</div>

				<div className="tab-content card-body p-0">
					<div className="tab-pane active">{
						children.find((child, idx) => this.tabState[idx].isActive)
					}</div>
				</div>
			</div>
		);
	}
}
