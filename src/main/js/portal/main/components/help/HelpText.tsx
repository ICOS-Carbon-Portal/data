import React from 'react';
import { HelpItem, HelpStorageListEntry, Documentation, EnvrifiedHelpMain } from '../../models/HelpStorage';
import config from '../../config';


export default function HelpText(props: {helpItem: HelpItem | undefined}){
	const { helpItem } = props;
	if (helpItem === undefined) return null;

	const main = (helpItem.main as EnvrifiedHelpMain)[config.envri] ?? helpItem.main;

	return helpItem
		? (
			<div style={{fontSize: '90%'}}>
				<p>{main}</p>
				<List list={helpItem.list} />
				<DocumentationList list={helpItem.documentation} />
			</div>
		)
		: null;
}

function List(props: {list?: HelpStorageListEntry[]}){
	const {list} = props;
	if (list === undefined || list.length === 0) return null;

	return (
		<ul className="dashed">
			{list.map((item, idx) => <ListItem key={'helpList_' + idx} item={item} />)}
		</ul>
	);
};

function ListItem(props: {item: HelpStorageListEntry}) {
	const {item} = props;
	const label = item.label === undefined
		? null
		: <b>{item.label}: </b>;

	const link = item.webpage
		? <a href={item.webpage} title="More information" target="_blank">
			<span className="glyphicon glyphicon-share" style={{marginLeft:15}} />
		</a>
		: null;

	return (
		<li style={{marginTop: 5}}>
			{label}<span>{item.comment || item.label}</span>{link}
		</li>
	);
};

function DocumentationList(props: {list: Documentation[] | undefined}) {
	const {list} = props;
	if (list === undefined || list.length === 0) return null;

	return (
		<ul className="dashed">
			{list.map((item, idx) => <DocItem key={'l' + idx} item={item} />)}
		</ul>
	);
};

function DocItem(props: {item: Documentation}) {
	const {item} = props;
	const url = new URL(item.url);
	url.hostname = url.hostname.replace(/^meta/, 'data');

	return (
		<li style={{marginTop: 5}}>
			<a href={url.href} title={"Download file " + item.txt}>Download documentation</a>
		</li>
	);
};
