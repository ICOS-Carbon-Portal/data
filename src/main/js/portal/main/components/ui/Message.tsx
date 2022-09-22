import React, { Component, ReactNode } from 'react';

type Props = {
	title: string
	onclick: () => void
}

export default class Message extends Component<Props>{
	render() {
		return (
			<div className="text-center" style={{ margin: '5vh 0' }}>
				<h1 className='pb-3'>{this.props.title}</h1>
				<button className="btn btn-lg btn-primary" onClick={this.props.onclick}>
					Find data
				</button>
			</div>
		)
	}
}