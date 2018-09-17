import React, { Component } from 'react';

export default class CopyValue extends Component {
	constructor(props){
		super(props);
		this.state = {
			showCopy: false
		};
	}

	handleBtnClick(){
		this.setState({showCopy: true});
	}

	copyUrl(){
		this.urlInput.select();
		document.execCommand('copy');
		this.setState({showCopy: false});
	}

	render(){
		const {showCopy} = this.state;
		const {btnText, copyHelpText, valToCopy} = this.props;

		return(
			<span>{showCopy
				? <CopyCtr
					self={this}
					valToCopy={valToCopy}
					copyHelpText={copyHelpText}
					copyClick={this.copyUrl.bind(this)}
				/>
				: <Btn
					show={!!valToCopy}
					btnText={btnText}
					clickAction={this.handleBtnClick.bind(this)}
				/>
			}</span>
		);
	}
}

const Btn = ({show, btnText, clickAction}) => {
	return (
		<button	onClick={clickAction} className="btn btn-default" style={show ? {} : {visibility: 'hidden'}}>
			{btnText}
		</button>
	);
};

const CopyCtr = ({self, valToCopy, copyHelpText, copyClick}) => {
	const inputClick = () => {
		self.urlInput.select();
	};

	return (
		<span className="input-group">
			<span className="input-group-btn">
				<button className="btn btn-default" onClick={copyClick} title={copyHelpText}>
					<span className="glyphicon glyphicon-copy" />
				</button>
			</span>
			<input
				ref={urlInput => self.urlInput = urlInput}
				onClick={inputClick}
				type="text"
				className="form-control"
				value={valToCopy}
				readOnly
			/>
		</span>
	);
};
