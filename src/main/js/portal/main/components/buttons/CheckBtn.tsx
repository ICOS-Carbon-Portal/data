import React, {type ChangeEventHandler, Component, type MutableRefObject} from "react";
import {type Style} from "../../../../common/main/style";


type Props = {
	onClick: ChangeEventHandler<HTMLInputElement>
	title?: string
	isChecked?: boolean
	checkboxDisabled?: boolean
	style?: Style
	checkRef?: MutableRefObject<HTMLInputElement | null>
};

export default class CheckBtn extends Component<Props> {
	render() {
		const onClick = this.props.onClick;
		const title = this.props.title || "";
		const isChecked = this.props.isChecked || false;

		return (
			<span title={title}>
				<input ref={this.props.checkRef} className="form-check-input" type="checkbox" onChange={onClick}
					checked={isChecked ?? "checked"} disabled={this.props.checkboxDisabled}>
				</input>
			</span>
		);
	}
}
