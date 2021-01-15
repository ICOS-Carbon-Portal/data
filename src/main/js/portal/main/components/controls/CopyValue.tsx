import React, { Component } from 'react';

type Props = {
	btnText: string
	copyHelpText: string
	valToCopy: string
}

type State = {
	showCopy: boolean
}

export default class CopyValue extends Component<Props, State> {
	urlInput?: HTMLInputElement | null

	constructor(props: Props){
		super(props);
		this.state = {
			showCopy: false
		};
	}

	handleBtnClick(){
		this.setState({showCopy: true});
	}

	copyUrl() {
		if (this.urlInput)
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

const Btn = ({show, btnText, clickAction}: {show: boolean, btnText: string, clickAction: () => void}) => {
	return (
		<button	onClick={clickAction} className="btn btn-default" style={show ? {marginBottom: 10} : {visibility: 'hidden'}}>
			{btnText}
		</button>
	);
};

const CopyCtr = ({ self, valToCopy, copyHelpText, copyClick }: { self: CopyValue, valToCopy: string, copyHelpText: string, copyClick: () => void }) => {
	const inputClick = () => {
		if (self.urlInput)
			self.urlInput.select();
	};

	return (
		<span className="input-group">
			<span className="input-group-btn">
				<button className="btn btn-default" onClick={copyClick} title={copyHelpText} style={{marginBottom: 10}}>
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
