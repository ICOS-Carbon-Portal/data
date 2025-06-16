import React, { Component, ReactNode } from 'react';

type Props = {
	title: string
	onclick: () => void
	onclickSecondary?: () => void
}

export default class Message extends Component<Props>{
	
	render() {
		const buttonSecondary = this.props.onclickSecondary ? 
			(<button className="btn btn-lg btn-warning d-block mx-auto my-3" onClick={this.props.onclickSecondary}>
				Restore previous cart
			</button>) :
			<></>;
		return (
			<div className="text-center" style={{ margin: '5vh 0', }}>
				<h1 className='pb-3'>{this.props.title}</h1>
				<button className="btn btn-lg btn-primary d-block mx-auto my-3" onClick={this.props.onclick}>
					Find data
				</button>
				{ buttonSecondary }
			</div>
		)
	}
}