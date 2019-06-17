import React, { Component } from 'react';

interface IProps {
	start: number
}

interface IState {
	start: number
}

export default class Test extends Component<IProps, IState> {
	constructor(props: IProps){
		super(props);
		this.state = {
			start: props.start
		};
	}

	render(){
		const {start} = this.state;

		return (
			<div>Hello there {start}</div>
		);
	}
}
