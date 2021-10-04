import React, { Component } from 'react';
import deepEqual from "deep-equal";


export default class Radio extends Component {
	constructor(props) {
		super(props);

		this.state = {
			radios: []
		};
	}

	componentDidUpdate(){
		const radiosProps = this.props.radios;
		const radiosState = this.state.radios;

		if ((radiosState.length === 0 && radiosProps && radiosProps.length) || !deepEqual(radiosProps, radiosState)){
			this.setState({radios: radiosProps});
		}
	}

	onClick(idx){
		const {radios} = this.state;
		if (radios[idx].isActive) return;

		const newRadios = radios.map((r, i) => {
			r.isActive = i === idx;
			return r;
		});

		this.setState({radios: newRadios});
		if (this.props.action) this.props.action(radios[idx].actionTxt);
	}

	render(){
		const containerStyle = this.props.containerStyle || {};
		const horizontal = this.props.horizontal === undefined ? true : this.props.horizontal;
		const {radios} = this.state;

		return (
			<div className="d-flex align-items-center" style={containerStyle}>
				{radios.length
					? radios.map((r, i) =>
						<RadioCtrl
							key={'radioCtrl' + i}
							horizontal={horizontal}
							txt={r.txt}
							isActive={r.isActive}
							action={this.onClick.bind(this, i)}
						/>
					)
					: null
				}
			</div>
		);
	}
}

const RadioCtrl = ({horizontal, txt, isActive, action}) => {
	const rootStyle = horizontal
		? {cursor:'pointer', marginRight:10}
		: {cursor:'pointer', display:'block', marginTop:3, marginBottom:3};
	const tickStyle = isActive ? {opacity:1} : {opacity:0};

	return (
		<span style={rootStyle} onClick={action}>
			<div className="input-group" data-toggle="buttons">
				<span className="btn btn-outline-secondary text-secondary bg-white">
					<span className="fas fa-check" style={tickStyle} />
				</span>
				<span className="input-group-text">{txt}</span>
			</div>
		</span>
	);
};

