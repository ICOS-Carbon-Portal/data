import React, { Component } from 'react';
import { Obj } from '../../../../common/main/types';

type Props = {
	isSorter: boolean
	isEnabled: boolean
	selectedItemKey: string
	isAscending: boolean
	itemClickAction: (varName: string) => void
	lookup: Obj
	defaultLbl?: string
}

type State = {
	dropdownOpen: boolean
}

export default class Dropdown extends Component<Props, State>{
	private outsideClickHandler: (e: any) => void
	private node: HTMLSpanElement | null = null

	constructor(props: Props){
		super(props);

		this.state = {
			dropdownOpen: false
		};

		this.outsideClickHandler = this.handleOutsideClick.bind(this);
		document.addEventListener('click', this.outsideClickHandler, false);
	}

	handleOutsideClick(e: MouseEvent) {
		if (!this.node) return;
		if (e.target === null) return;

		if (!this.node.contains(e.target as Node) && this.state.dropdownOpen) {
			this.setState({dropdownOpen: false});
		}
	}

	onDropdownClick(){
		this.setState({dropdownOpen: !this.state.dropdownOpen});
	}

	onDropDownItemClick(selectedItemKey: string){
		if (this.props.itemClickAction) {
			this.setState({dropdownOpen: !this.state.dropdownOpen});
			this.props.itemClickAction(selectedItemKey);
		}
	}

	componentWillUnmount(){
		document.removeEventListener('click', this.outsideClickHandler, false);
	}

	render(){
		const {dropdownOpen} = this.state;
		const {isEnabled, isSorter, selectedItemKey, isAscending, lookup, defaultLbl} = this.props;
		const nodeClass = dropdownOpen ? 'dropdown open' : 'dropdown';

		return (
			<span ref={span => this.node = span} className={nodeClass} style={{display: 'inline-block', marginLeft: 8, verticalAlign: 8}}>
				{
					isSorter
						? <SortButton
							selectedItemKey={selectedItemKey}
							isAscending={isAscending}
							clickAction={this.onDropdownClick.bind(this)}
							lookup={lookup}
							defaultLbl={defaultLbl}
						/>
						: <Button
							isEnabled={isEnabled}
							selectedItemKey={selectedItemKey}
							clickAction={this.onDropdownClick.bind(this)}
							lookup={lookup}
							defaultLbl={defaultLbl}
						/>
				}

				<ul className="dropdown-menu">{
					Object.keys(lookup).map((key, idx) => {
						const glyphCls = key == selectedItemKey ? 'glyphicon glyphicon-sort' : '';
						return (
							<li key={'ddl' + idx}>
								<a onClick={this.onDropDownItemClick.bind(this, key)} style={{ cursor: 'pointer' }}>
									<span className={glyphCls} style={{ display: 'inline-block', width: 14, margin: '0 5px 0 -5px' }}/> {lookup[key]}
								</a>
							</li>
						);
					})
				}</ul>
			</span>
		);
	}
}

type SortButtonProps = Pick<Props, 'selectedItemKey' | 'isAscending' | 'lookup' | 'defaultLbl'> & { clickAction: () => void }

const SortButton = ({ selectedItemKey, isAscending, clickAction, lookup, defaultLbl = 'Sort by' }: SortButtonProps) => {
	const glyphCls = selectedItemKey
		? isAscending
			? 'glyphicon glyphicon-sort-by-attributes'
			: 'glyphicon glyphicon-sort-by-attributes-alt'
		: '';

	const lbl = selectedItemKey
		? lookup[selectedItemKey]
		: defaultLbl;

	return (
		<button className="btn btn-default dropdown-toggle" type="button" onClick={clickAction}>
			<span><span className={glyphCls}/> {lbl}</span> <span className="caret"/>
		</button>
	);
};

type ButtonProps = Pick<Props, 'selectedItemKey' | 'isEnabled' | 'lookup' | 'defaultLbl'> & { clickAction: () => void }

const Button = ({ isEnabled, selectedItemKey, clickAction, lookup, defaultLbl = 'Select option' }: ButtonProps) => {
	if (isEnabled) {
		const lbl = selectedItemKey
			? lookup[selectedItemKey]
			: defaultLbl;
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
				<span>{defaultLbl}</span> <span className="caret"/>
			</button>
		);
	}

};
