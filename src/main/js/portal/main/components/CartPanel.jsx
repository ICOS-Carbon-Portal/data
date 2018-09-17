import React, { Component } from 'react';
import PreviewBtn from './buttons/PreviewBtn.jsx';
import EditablePanelHeading from './controls/EditablePanelHeading.jsx';
import SearchResultTableRow from './searchResult/SearchResultTableRow.jsx';
import CartBtn from './buttons/CartBtn.jsx';


export default class CartPanel extends Component {
	constructor(props){
		super(props);
		this.state = {
			selectedItemId: props.previewitemId
		};

		this.mouseClick = undefined;
	}

	handleItemClick(id){
		this.setState({selectedItemId: id});
	}

	handleSaveCartName(newName){
		if (this.props.setCartName) this.props.setCartName(newName);
	}

	handlePreview(ids){
		if (this.props.setPreviewItem) this.props.setPreviewItem(ids);
	}

	render(){
		const props = this.props;
		console.log({cart: props.cart, extendedDobjInfo: props.extendedDobjInfo});

		return (
			<div className="panel panel-default">
				<EditablePanelHeading
					editValue={props.cart.name}
					saveValueAction={this.handleSaveCartName.bind(this)}
					iconEditClass="glyphicon glyphicon-edit"
					iconEditTooltip="Edit download name"
					iconSaveClass="glyphicon glyphicon-floppy-save"
					iconSaveTooltip="Save new cart name"
				/>

				<div className="panel-body">
					<div>
						<div className="text-right">
							<CartBtn
								style={{float: 'right', marginBottom: 10, marginLeft: 10}}
								checkedObjects={props.checkedObjectsInCart}
								clickAction={props.removeFromCart}
								enabled={props.checkedObjectsInCart.length}
								type='remove'
							/>
							<PreviewBtn
								style={{marginBottom: 10, marginRight: 10}}
								checkedObjects={props.checkedObjectsInCart.flatMap(c => props.objectsTable.filter(o => o.dobj === c))}
								clickAction={this.handlePreview.bind(this)}
								lookup={props.lookup}
							/>
						</div>

						<div className="table-responsive">
							<table className="table">
								<tbody>{
									props.cart.items.map((objInfo, i) => {
										const extendedInfo = props.extendedDobjInfo.find(ext => ext.dobj === objInfo.id);
										const isChecked = props.checkedObjectsInCart.includes(objInfo.id);
										objInfo.fileName = objInfo.itemName;
										objInfo.dobj = objInfo.id;

										return (
											<SearchResultTableRow
												lookup={props.lookup}
												extendedInfo={extendedInfo}
												preview={props.preview}
												objInfo={objInfo}
												key={'dobj_' + i}
												onCheckboxChange={props.handleCheckboxChange}
												isChecked={isChecked}
											/>
										);
									})
								}</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
