import React, { Component } from 'react';
import HelpButton from '../../containers/help/HelpButton';
import { HelpItemName } from '../../models/HelpStorage';

type Props = {
	btnText: string
	copyHelpText: string
	valToCopy: string
	helpButtonName?: HelpItemName
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
		const {btnText, copyHelpText, valToCopy, helpButtonName} = this.props;

		return(
			<span>{showCopy
				? <CopyCtr
					self={this}
					valToCopy={valToCopy}
					copyHelpText={copyHelpText}
					helpButtonName={helpButtonName}
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

type CopyCtrProps = {
	self: CopyValue
	valToCopy: string
	copyHelpText: string
	copyClick: () => void
	helpButtonName?: HelpItemName
}

const CopyCtr = ({ self, valToCopy, copyHelpText, copyClick, helpButtonName}: CopyCtrProps) => {
	const inputClick = () => {
		if (self.urlInput)
			self.urlInput.select();
	};

	return (
		<span className="input-group" style={{display: 'inline-table'}}>
			<span className="input-group-btn">
				<button className="btn btn-default" onClick={copyClick} title={copyHelpText} style={{marginBottom: 10}}>
					<span className="glyphicon glyphicon-copy" />
				</button>
				{helpButtonName &&
					<button className="btn btn-default" style={{marginBottom: 10, cursor: "default"}}>
						<HelpButton name={helpButtonName} title="Click to toggle help" overrideStyles={{paddingLeft: 0}}/>
					</button>
				}
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
