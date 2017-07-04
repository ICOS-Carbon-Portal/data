import React, { Component } from 'react';
import PreviewTimeSerie from './PreviewTimeSerie.jsx';

export default class Preview extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {preview} = this.props;

		return (
			<div>{
				preview
					? <PreviewRoute preview={preview} {...this.props} />
					: null
			}</div>
		);
	}
}

const PreviewRoute = props => {
	switch (props.preview.type){

		case 'TIMESERIES':
			return <PreviewTimeSerie {...props} />;

		default:
			return <div>This type of preview is not yet implemented</div>;
	}
};
