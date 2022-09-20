import React, { Component } from 'react';
import { HelpItemName } from '../../models/HelpStorage';

type Props = {
	btnText: string
	copyHelpText: string
	valToCopy: string
	helpButtonName?: HelpItemName
}

export default class CopyValue extends Component<Props> {
	urlInput?: HTMLInputElement | null

	copyUrl() {
		if (this.urlInput)
			this.urlInput.select();

		document.execCommand('copy');
		this.setState({showCopy: false});
	}

	render(){
		const {copyHelpText, valToCopy, helpButtonName} = this.props;

		return(
			<span className='fs-6'>
				<CopyCtr
					self={this}
					valToCopy={valToCopy}
					copyHelpText={copyHelpText}
					copyClick={this.copyUrl.bind(this)}
				/>
			</span>
		);
	}
}

type CopyCtrProps = {
	self: CopyValue
	valToCopy: string
	copyHelpText: string
	copyClick: () => void
}

const CopyCtr = ({ self, valToCopy, copyHelpText, copyClick}: CopyCtrProps) => {
	const inputClick = () => {
		if (self.urlInput)
			self.urlInput.select();
	};

	return (
		<span className="input-group">
			<input
				ref={urlInput => self.urlInput = urlInput}
				onClick={inputClick}
				type="text"
				className="form-control form-control-sm"
				value={valToCopy}
				readOnly
			/>
			<button className="btn btn-outline-secondary" style={{ borderColor: '#ced4da' }} onClick={copyClick} title={copyHelpText}>
				<span className="fas fa-copy" />
			</button>
		</span>
	);
};
