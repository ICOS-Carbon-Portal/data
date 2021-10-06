import React, { Component } from 'react';


export default class Dropdown extends Component{
	constructor(props){
		super(props);

		const linkElement = document.createElement('link');
		linkElement.setAttribute('rel', 'stylesheet');
		linkElement.setAttribute('type', 'text/css');
		const cls = 'li.ddlOpt:hover {background-color: rgb(221, 221, 221);}';
		linkElement.setAttribute('href', 'data:text/css;charset=UTF-8,' + encodeURIComponent(cls));
		document.head.appendChild(linkElement);

		this.state = {
			dropdownOpen: false,
			hoverIdx: undefined
		};

		this.outsideClickHandler = this.handleOutsideClick.bind(this);
		this.hoverHandler = this.handleHover.bind(this);
		document.addEventListener('click', this.outsideClickHandler, false);
	}

	handleOutsideClick(e){
		if (!this.node.contains(e.target) && this.state.dropdownOpen) {
			this.setState({dropdownOpen: false});
		}
	}

	handleHover(idx){
		this.setState({hoverIdx: idx});
	}

	onDropdownClick(){
		this.setState({dropdownOpen: !this.state.dropdownOpen});
	}

	onDropDownItemClick(selectedIdx){
		if (this.props.itemClickAction) {
			this.setState({dropdownOpen: !this.state.dropdownOpen});
			this.props.itemClickAction(selectedIdx);
		}
	}

	componentWillUnmount(){
		document.removeEventListener('click', this.outsideClickHandler, false);
	}

	render(){
		const {dropdownOpen} = this.state;
		const props = this.props;
		const selectOptions = props.selectOptions || [];
		const selectedItemKey = props.selectedItemKey;
		const buttonLbl = props.buttonLbl;

		const rootStyle = Object.assign({display: 'inline-block', marginBottom: 10}, props.style);
		const menuCls = dropdownOpen ? 'dropdown-menu show' : 'dropdown-menu';

		return (
			<span ref={div => this.node = div} className="dropdown" style={rootStyle}>{
				<Button
					selectedItemKey={selectedItemKey}
					clickAction={this.onDropdownClick.bind(this)}
					selectOptions={selectOptions}
					buttonLbl={buttonLbl}
				/>
			}

				<ul className={menuCls}>
					{
					selectOptions.map((opt, idx) =>
						<li
							style={{padding: '2px 10px', cursor:'pointer', whiteSpace:'nowrap'}}
							className="dropdown-item"
							key={'ddl' + idx}
							onClick={this.onDropDownItemClick.bind(this, idx)}>
							{opt}
						</li>
					)
				}</ul>
			</span>
		);
	}
}

const Button = ({ selectedItemKey, clickAction, selectOptions, buttonLbl = 'Select option' }) => {
	const lbl = selectedItemKey
		? selectOptions[selectedItemKey]
		: buttonLbl;

	return (
		<button className="btn btn-outline-secondary dropdown-toggle bg-white text-dark" type="button" onClick={clickAction}>
			<span>{lbl}</span> <span className="caret" />
		</button>
	);
};
