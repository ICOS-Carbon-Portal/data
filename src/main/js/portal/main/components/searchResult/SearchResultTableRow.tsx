import React, { Component, MouseEvent, CSSProperties } from 'react';
import CheckBtn from '../buttons/ChechBtn';
import {isSmallDevice, formatDate} from '../../utils';
import {LinkifyText} from '../LinkifyText';
import config, {timezone} from '../../config';
import { ObjectsTable, ExtendedDobjInfo } from "../../models/State";
import Preview from '../../models/Preview';


const truncateStyle: CSSProperties = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

const iconStation = '//static.icos-cp.eu/images/icons/station.svg';
const iconArrows = '//static.icos-cp.eu/images/icons/arrows-alt-v-solid.svg';
const iconTime = '//static.icos-cp.eu/images/icons/time.svg';

interface SimpleObjectTableRowProps {
	objInfo: ObjectsTable
	viewMetadata: (doj: string) => void
	extendedInfo: Partial<ExtendedDobjInfo[0]> | undefined
	preview: Preview
	updateCheckedObjects: (ids: string) => void
	isChecked: boolean
	checkedObjects: ObjectsTable[]
	labelLookup: any
}

export default class SimpleObjectTableRow extends Component<SimpleObjectTableRowProps> {
	constructor(props: SimpleObjectTableRowProps){
		super(props);
	}

	handleViewMetadata(ev: MouseEvent){
		if (this.props.viewMetadata && !ev.ctrlKey && !ev.metaKey && this.props.objInfo.dobj) {
			ev.preventDefault();
			this.props.viewMetadata(this.props.objInfo.dobj);
		}
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const extendedInfo = props.extendedInfo
			? props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: {theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg'}
			: props.extendedInfo;
		const location = extendedInfo && (extendedInfo.site ? extendedInfo.site : extendedInfo.station ? extendedInfo.station.trim() : undefined);
		const locationString = location ? ` from ${location}` : '';
		const offset = timezone[config.envri].offset;
		const dateString = `${formatDate(new Date(objInfo.timeStart ?? ""), offset)} \u2013 ${formatDate(new Date(objInfo.timeEnd ?? ""), offset)}`;
		const orgSpecLabel = props.labelLookup[objInfo.spec] ?? "";
		const specLabel = config.envri === "SITES" && orgSpecLabel.includes(',')
			? orgSpecLabel.substr(0, orgSpecLabel.indexOf(','))
			: orgSpecLabel;
		const title = extendedInfo && extendedInfo.title ? extendedInfo.title : `${specLabel}${locationString}, ${dateString}`;
		const samplingHeight = extendedInfo && extendedInfo.samplingHeight ? extendedInfo.samplingHeight + ' meters' : undefined;
		const checkboxDisabled = objInfo.level === 0;
		const checkBtnTitle = checkboxDisabled
			? 'You cannot download or preview level 0 data through this portal'
			: `Click to select this data object for preview or add to cart`;
		const metadataHash = getMetadataHash(objInfo.dobj);

		return(
			<tr style={{margin: '20px 0'}}>
				<td style={{textAlign: 'center', width: 30, padding: '16px 0px'}}>
					<CheckBtn
						onClick={() => props.updateCheckedObjects(objInfo.dobj)}
						title={checkBtnTitle}
						isChecked={props.isChecked}
						checkboxDisabled={checkboxDisabled ? true : false}
					/>
				</td>
				<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 style={{marginTop: 0}}>
						<a title="View metadata" href={metadataHash} onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{title}</a>
					</h4>
					<Description extendedInfo={extendedInfo} truncateStyle={truncateStyle} />
					{extendedInfo &&
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} />
						{config.envri === "SITES" && extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={iconStation} iconHeight={16} />
						}
						<ExtendedInfoItem item={samplingHeight} icon={iconArrows} iconHeight={15} title="Sampling height" />
						<ExtendedInfoItem item={objInfo.temporalResolution} icon={iconTime} iconHeight={16} title="Time resolution" />
					</div>
					}
				</td>
			</tr>
		);
	}
}

export const getMetadataHash = (dobj?: string) => {
	const hashObj = {
		route: 'metadata',
		id: dobj?.split('/').pop()
	};

	return "#" + encodeURIComponent(JSON.stringify(hashObj));
};

const Description: React.FunctionComponent<{
	extendedInfo: Partial<ExtendedDobjInfo[0]> | undefined,
	truncateStyle: CSSProperties
}> = ({ extendedInfo, truncateStyle}) => {
	if (!(extendedInfo && extendedInfo.description)) return null;

	return isSmallDevice()
		? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
		: <LinkifyText text={extendedInfo.description} />;
};

const ExtendedInfoItem: React.FunctionComponent<{
	item?: string,
	icon?: string,
	iconHeight?: number,
	iconRightMargin?: number,
	title?: string
}> = ({ item, icon, iconHeight = 18, iconRightMargin = 0, title = "" }) => {
	const imgStyle = {height: iconHeight, marginRight: iconRightMargin};

	return (item && icon
		? <span className="extended-info-item" >
			<img src={icon} title={title} style={imgStyle}/> <span style={{verticalAlign: 'middle'}}>{item}</span>
		</span>
		: null
	);
};
