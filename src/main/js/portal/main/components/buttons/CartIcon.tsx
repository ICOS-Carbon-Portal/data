import React, { Component, CSSProperties } from 'react';
import { UrlStr } from '../../backend/declarations';
import { ObjectsTable } from '../../models/State';
import { styles } from '../styles';

type Props = {
	style: CSSProperties
	objInfo: ObjectsTable
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

		return(
			<span style={style}>{objInfo && objInfo.level === 0
				? <span
					style={styles.disabledClickIcon}
					title="Data level 0 is available upon request"
					className="glyphicon glyphicon-plus-sign text-muted"
				/>
				: isAddedToCart
					? <span
						style={styles.clickIcon}
						title="Remove from data cart"
						className="glyphicon glyphicon-minus-sign text-danger"
						onClick={this.handleRemoveFromCartClick.bind(this)}
					/>
					: <span
						style={styles.clickIcon}
						title="Add to data cart"
						className="glyphicon glyphicon-plus-sign text-primary"
						onClick={this.handleAddToCartClick.bind(this)}
					/>
			}</span>
		);
	}
}
