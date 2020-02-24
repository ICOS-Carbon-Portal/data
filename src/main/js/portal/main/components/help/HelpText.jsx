import React, { Component } from 'react';


export default class HelpText extends Component{
	constructor(props){
		super(props);

		this.state = {
			helpTxtItem: undefined
		};
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.helpTxtItem !== undefined){
			this.setState({
				helpTxtItem: nextProps.helpTxtItem
			});
		}
	}

	render() {
		const {helpTxtItem} = this.state;

		if (!helpTxtItem) return null;

		return (
			<div style={{fontSize: '90%'}}>
				<p>{helpTxtItem.main}</p>
				<List list={helpTxtItem.list} />
			</div>
		);
	}
}

const List = ({list}) => {
	if (list === undefined || list.length === 0) return null;

	return (
		<ul className="dashed">
			{list.map((item, idx) => <ListItem key={'helpList_' + idx} item={item} />)}
		</ul>
	);
};

const ListItem = ({item}) => {
	const label = item.lbl
		? <b>{item.lbl}: </b>
		: null;

	const link = item.webpage
		? <a href={item.webpage} title="More information" target="_blank">
			<span className="glyphicon glyphicon-share" style={{marginLeft:15}} />
		</a>
		: null;

	return (
		<li style={{marginTop: 5}}>
			{label}<span>{item.txt}</span>{link}
		</li>
	);
};
