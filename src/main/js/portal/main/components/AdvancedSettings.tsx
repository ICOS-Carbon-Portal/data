import React, {Component, MouseEvent, CSSProperties} from 'react';
import Slider from "./ui/Slider";
import CheckBtn from "./buttons/ChechBtn";
import {Style} from "../../../common/main/style";
import {ReducedProps} from "../containers/Search";


type Props = ReducedProps['advanced'] & {tabHeader: string};

export default class AdvancedSettings extends Component<Props> {
	render(){
		const {searchOptions, updateSearchOption} = this.props;
		console.log(searchOptions);

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					<h3 className="panel-title">Search options</h3>
				</div>

				<div className="panel-body" style={{paddingTop:0}}>
					<CheckButton
						onClick={() => updateSearchOption({name: 'showDeprecated', value: !searchOptions.showDeprecated})}
						isChecked={searchOptions.showDeprecated}
						styleBtn={{margin:'5px 2px', fontSize:10}}
						text={'Show deprecated objects'}
					/>
				</div>
			</div>
		);
	}
}

interface CheckButton {
	onClick: (event: MouseEvent<HTMLButtonElement>) => void
	isChecked: boolean
	text: string
	checkboxDisabled?: boolean
	styleBtn?: Style
	styleTxt?: Style
}

const CheckButton = (props: CheckButton) => {
	const {onClick, isChecked, text} = props;
	const checkboxDisabled = props.checkboxDisabled || false;
	const defaultStyleBtn = {margin:0, fontSize:10};
	const styleBtn: Style = props.styleBtn
		? Object.assign(defaultStyleBtn, props.styleBtn)
		: defaultStyleBtn;
	const defaultStyleTxt: CSSProperties = {marginLeft:3, top:1, position:'relative'};
	const styleTxt: Style = props.styleTxt
		? Object.assign(defaultStyleTxt, props.styleTxt)
		: defaultStyleTxt;

	return (
		<div style={{marginTop:15}}>
			<CheckBtn onClick={onClick} isChecked={isChecked} style={styleBtn} checkboxDisabled={checkboxDisabled} />
			<span style={styleTxt}>{text}</span>
		</div>
	);
};
