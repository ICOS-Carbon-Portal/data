import React, { Component, CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import {  Route } from '../../models/State';
import { styles } from '../styles';

type Props = {
	style: CSSProperties,
  updateRoute: (route: Route) => void;
	// enabled: boolean
	addSearch: (url: UrlStr) => Promise<void>
}

export default class SavedSearchesBtn extends Component<Props> {
	constructor(props: Props){
		super(props);
	}

	handleClick(){
		this.props.addSearch(location.href).then(_ => this.props.updateRoute("savedSearches"))

	}
 //andra rout on click, post nya ss object, till states, saved search, set en egen lable,


	render(){
		const {style, updateRoute} = this.props;

		return (
			<div style={style}>
				<button onClick={this.handleClick.bind(this)} className="btn btn-primary"  title="Save search in your profile">
					Save Search
				</button>
			</div>
		);
	}
}
