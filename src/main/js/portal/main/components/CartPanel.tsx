import React, { Component } from 'react';
import PreviewBtn from './buttons/PreviewBtn';
import EditablePanelHeading from './controls/EditablePanelHeading';
import SearchResultRegularRow from './searchResult/SearchResultRegularRow';
import CartBtn from './buttons/CartBtn';
import CheckAllBoxes from './controls/CheckAllBoxes';
import { DataCartProps } from '../containers/DataCart';

type Props = {
	previewitemId?: string
	previewItemAction: (urls: string[]) => void
	updateCheckedObjects: (urls: any) => any
	handleAllCheckboxesChange: () => void
} & DataCartProps

type State = {
	selectedItemId?: string
}

export default class CartPanel extends Component<Props, State> {
	constructor(props: Props){
		super(props);
		this.state = {
			selectedItemId: props.previewitemId
		};
	}

	handleItemClick(id: string){
		this.setState({selectedItemId: id});
	}

	handleSaveCartName(newName: string){
		if (this.props.setCartName) this.props.setCartName(newName);
	}

	handlePreview(ids: string[]){
		this.props.previewItemAction(ids);
	}

	handleAllCheckboxesChange() {
		this.props.handleAllCheckboxesChange();
	}

	render(){
		const props = this.props;
		const objectText = props.checkedObjectsInCart.length <= 1 ? "object" : "objects";
		const checkedObjects = props.cart.items
			.filter(item => props.checkedObjectsInCart.includes(item.dobj));
		const datasets = checkedObjects.map(obj => obj.dataset);
		const previewTypes = checkedObjects.map(obj => obj.type);

		return (
			<div className="card">
				<EditablePanelHeading
					editValue={props.cart.name}
					saveValueAction={this.handleSaveCartName.bind(this)}
					iconEditClass="fas fa-edit"
					iconEditTooltip="Edit download name"
					iconSaveClass="fas fa-save"
					iconSaveTooltip="Save new cart name"
				/>

				<div className="card-body">
					<div className="panel-srollable-controls clearfix row justify-content-between">
						<div className="col-4">
							<CheckAllBoxes
								checkCount={props.checkedObjectsInCart.length}
								totalCount={props.cart.count}
								onChange={this.props.handleAllCheckboxesChange} />
							{ props.checkedObjectsInCart.length > 0 &&
								<span style={{marginLeft: 6, verticalAlign: -6}}>{props.checkedObjectsInCart.length} {objectText} selected</span>
							}
						</div>
						<div className="col-8">
							<CartBtn
								style={{float: 'right', marginBottom: 10, marginLeft: 10}}
								checkedObjects={props.checkedObjectsInCart}
								clickAction={props.removeFromCart}
								enabled={props.checkedObjectsInCart.length > 0}
								type='remove'
							/>
							<PreviewBtn
								style={{float: 'right', marginBottom: 10, marginRight: 10}}
								checkedObjects={checkedObjects}
								datasets={datasets}
								previewTypes={previewTypes}
								clickAction={this.handlePreview.bind(this)}
							/>
						</div>
					</div>

					<table className="table">
						<tbody>{
							props.cart.items.map((objInfo, i) => {
								const extendedInfo = props.extendedDobjInfo.find(ext => ext.dobj === objInfo.dobj);
								if (extendedInfo === undefined) return null;

								const isChecked = props.checkedObjectsInCart.includes(objInfo.dobj);

								return (
									<SearchResultRegularRow
										labelLookup={props.labelLookup}
										extendedInfo={extendedInfo}
										preview={props.preview}
										objInfo={objInfo}
										key={'dobj_' + i}
										updateCheckedObjects={props.updateCheckedObjects}
										isChecked={isChecked}
										isCartView={true}
									/>
								);
							})
						}</tbody>
					</table>
				</div>
			</div>
		);
	}
}
