import React, { Component, PropTypes } from 'react';

class ShowLazily extends Component {
	constructor(props) {
		super(props);
		this.state = {show: false};
	}

	componentDidMount(){
		var self = this;
		self.timeout = setTimeout(
			() => self.setState({show: true}),
			self.props.delay
		);
	}

	componentWillUnmount(){
		clearTimeout(this.timeout);
	}

	render(){
		return this.state.show
			? <div>{this.props.children}</div>
			: null;
	}
}

export default ShowLazily;