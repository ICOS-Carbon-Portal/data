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
		const isEnabled = props.isEnabled === undefined ? true : props.isEnabled;
		const isSorter = props.isSorter === undefined ? false : props.isSorter;
		const isAscending = props.isAscending === undefined ? false : props.isAscending;
		const selectOptions = props.selectOptions || [];
		const selectedItemKey = props.selectedItemKey;
		const buttonLbl = props.buttonLbl;

		const nodeClass = dropdownOpen ? 'dropdown open' : 'dropdown';
		const rootStyle = Object.assign({display: 'inline-block', marginBottom: 10}, props.style);

		return (
			<span ref={div => this.node = div} className={nodeClass} style={rootStyle}>{
				isSorter && selectedItemKey !== 'thematic'
					? <SortButton
						isEnabled={isEnabled}
						selectedItemKey={selectedItemKey}
						isAscending={isAscending}
						clickAction={this.onDropdownClick.bind(this)}
						selectOptions={selectOptions}
						buttonLbl={buttonLbl}
					/>
					: <Button
						isEnabled={isEnabled}
						selectedItemKey={selectedItemKey}
						clickAction={this.onDropdownClick.bind(this)}
						selectOptions={selectOptions}
						buttonLbl={buttonLbl}
					/>
				}

				<ul className="dropdown-menu">
					{
					selectOptions.map((opt, idx) =>
						<li
							style={{padding: '2px 10px', cursor:'pointer', whiteSpace:'nowrap'}}
							className="ddlOpt"
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

const SortButton = ({isEnabled, selectedItemKey, isAscending, clickAction, selectOptions, buttonLbl = 'Sort by'}) => {
	if (isEnabled) {
		const glyphCls = selectedItemKey
			? isAscending
				? 'glyphicon glyphicon-sort-by-attributes'
				: 'glyphicon glyphicon-sort-by-attributes-alt'
			: '';

		const lbl = selectedItemKey
			? selectOptions[selectedItemKey]
			: buttonLbl;

		return (
			<button className="btn btn-default dropdown-toggle" type="button" onClick={clickAction}>
				<span><span className={glyphCls}/> {lbl}</span> <span className="caret"/>
			</button>
		);
	} else {
		return (
			<button className="btn btn-default dropdown-toggle disabled" type="button">
				<span>{buttonLbl}</span> <span className="caret"/>
			</button>
		);
	}
};

const Button = ({isEnabled, selectedItemKey, clickAction, selectOptions, buttonLbl = 'Select option'}) => {
	if (isEnabled) {
		const lbl = selectedItemKey !== undefined
			? selectOptions[selectedItemKey]
			: buttonLbl;
		const btnCls = isEnabled
			? 'btn btn-default dropdown-toggle'
			: 'btn btn-default dropdown-toggle disabled';

		return (
			<button className={btnCls} type="button" onClick={clickAction}>
				<span>{lbl}</span> <span className="caret" />
			</button>
		);
	} else {
		return (
			<button className="btn btn-default dropdown-toggle disabled" type="button">
				<span>{buttonLbl}</span> <span className="caret"/>
			</button>
		);
	}

};