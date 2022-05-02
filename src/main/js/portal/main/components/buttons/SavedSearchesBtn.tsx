import React, { Component, CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import {  Route } from '../../models/State';

type Props = {
	style: CSSProperties,
  updateRoute: (route: Route) => void;
	addSearch: (url: UrlStr) => Promise<void>
}

export default class SavedSearchesBtn extends Component<Props> {
	constructor(props: Props){
		super(props);
	}

	handleAddSearchClick(){
		this.props.addSearch(location.href).then(_ => this.props.updateRoute("savedSearches"))

	}

	render(){
		const {style} = this.props;

		return (
			<div style={style} className="fa-solid fa-heart">
				<button onClick={this.handleAddSearchClick.bind(this)} className="btn btn-primary" title="Save search in your profile">
					Save Search
				</button>
			</div>
		);
	}
}
