import React, { Component, CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import { addingToCartProhibition } from '../../models/CartItem';
import { DataObject } from '../../models/State';
import { styles } from '../styles';

type Props = {
	style: CSSProperties
	objInfo: DataObject
	addToCart: (ids: UrlStr[]) => void
	removeFromCart: (ids: UrlStr[]) => void
	isAddedToCart: boolean
}

export default class CartIcon extends Component<Props> {
	constructor(props: Props){
		super(props);
	}

	handleAddToCartClick(){
		const { objInfo, addToCart} = this.props;
		if (addToCart) addToCart([objInfo.dobj]);
	}

	handleRemoveFromCartClick(){
		const { objInfo, removeFromCart} = this.props;
		if (removeFromCart) removeFromCart([objInfo.dobj]);
	}

	render(){
		const {isAddedToCart, objInfo, style} = this.props;
		const {allowCartAdd, uiMessage} = addingToCartProhibition(objInfo);

		return(
			<span style={style}>{allowCartAdd
				? isAddedToCart
					? <span
						style={styles.clickIcon}
						title="Remove from data cart"
						className="fas fa-minus-circle text-danger"
						onClick={this.handleRemoveFromCartClick.bind(this)}
					/>
					: <span
						style={styles.clickIcon}
						title="Add to data cart"
						className="fas fa-plus-circle text-primary"
						onClick={this.handleAddToCartClick.bind(this)}
					/>
				: <span
					style={styles.disabledClickIcon}
					title={uiMessage}
					className="fas fa-plus-circle text-muted"
				/>
			}</span>
		);
	}
}
