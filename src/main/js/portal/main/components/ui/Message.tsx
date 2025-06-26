import React, { Component, ReactNode } from 'react';

type Props = {
	title: string
	findData: () => void
	restorePriorCart?: () => void
}

export default class Message extends Component<Props>{
	render() {
		const buttonRestorePriorCart = this.props.restorePriorCart ? 
			(<button className="btn btn-lg btn-warning d-block mx-auto my-3" onClick={this.props.restorePriorCart}>
				Restore previous cart
			</button>) :
			<></>;
		return (
			<div className="text-center" style={{ margin: '5vh 0' }}>
				<h1 className='pb-3'>{this.props.title}</h1>
				<button className="btn btn-lg btn-primary" onClick={this.props.findData}>
					Find data
				</button>
				{ buttonRestorePriorCart }
			</div>
		)
	}
}