import React, { Component, CSSProperties } from 'react';

type Props = {
	style: CSSProperties
	checkedObjects: string[]
	clickAction: (ids: string[]) => void
	enabled: boolean
	type?: 'remove' | 'add'
	title?: string
}

export default class SavedSearchesBtn extends Component<Props> {
	constructor(props: Props){
		super(props);
	}

	handleAddToCartClick(){
		const {checkedObjects, clickAction} = this.props;
		if (clickAction) clickAction(checkedObjects);
	}

	render(){
		const {style, enabled, type, title} = this.props;
		const btnText = (type === 'remove') ? 'Remove from cart' : 'Add to cart';
		const btnType = (type === 'remove') ? 'btn-outline-secondary' : 'btn-primary';
		const className = `btn ${btnType} ${enabled ? "" : "disabled"}`;
		const btnStyle: CSSProperties = enabled ? {} : {pointerEvents: 'auto', cursor: 'not-allowed'};

		return (
			<div style={style}>
				<button id="add-to-cart-button" onClick={this.handleAddToCartClick.bind(this)} className={className} style={btnStyle} disabled={!enabled} title={title}>
					{btnText}
				</button>
			</div>
		);
	}
}
