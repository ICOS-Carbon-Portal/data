import React, {Component, Fragment, MouseEvent, CSSProperties} from 'react';
import CheckBtn from "./buttons/ChechBtn";
import {Style} from "../../../common/main/style";
import {ReducedProps} from "../containers/Search";
import Slider from "./ui/Slider";
import FilterByPid from "./filters/FilterByPid";


type Props = ReducedProps['advanced'] & {tabHeader: string};

export default class AdvancedSettings extends Component<Props> {
	render(){
		const {searchOptions, updateSearchOption, queryMeta, filterFreeText, updateSelectedPids} = this.props;
		const {showDeprecated} = searchOptions;

		return (
			<Fragment>
				<div className="panel panel-default">
					<div className="panel-heading">
						<h3 className="panel-title">Free text filters</h3>
					</div>

					<Slider startCollapsed={false}>
						<div className="panel-body" style={{paddingTop:0}}>
							<FilterByPid
								queryMeta={queryMeta}
								pidList={filterFreeText.pidList}
								selectedPids={filterFreeText.selectedPids}
								updateSelectedPids={updateSelectedPids}
							/>
						</div>
					</Slider>
				</div>

				<div className="panel panel-default">
					<div className="panel-heading">
						<h3 className="panel-title">Search options</h3>
					</div>

					<Slider startCollapsed={false}>
						<div className="panel-body">
							<CheckButton
								onClick={() => updateSearchOption({name: 'showDeprecated', value: !showDeprecated})}
								isChecked={showDeprecated}
								text={'Show deprecated objects'}
							/>
						</div>
					</Slider>
				</div>
			</Fragment>
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
	const defaultStyleBtn = {margin:0, fontSize:12};
	const styleBtn: Style = props.styleBtn
		? Object.assign(defaultStyleBtn, props.styleBtn)
		: defaultStyleBtn;
	const defaultStyleTxt: CSSProperties = {marginLeft:5, top:1, position:'relative'};
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
