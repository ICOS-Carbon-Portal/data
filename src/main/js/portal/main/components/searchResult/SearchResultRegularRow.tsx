import React, { Component, MouseEvent, CSSProperties } from 'react';
import CheckBtn from '../buttons/ChechBtn';
import {isSmallDevice, getLastSegmentInUrl, linesToShowStyle} from '../../utils';
import {LinkifyText} from '../LinkifyText';
import config from '../../config';
import { ObjectsTable, ExtendedDobjInfo } from "../../models/State";
import Preview from '../../models/Preview';
import CartItem from '../../models/CartItem';


const truncateStyle: CSSProperties = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

const iconStation = '//static.icos-cp.eu/images/icons/station.svg';
const iconArrows = '//static.icos-cp.eu/images/icons/arrows-alt-v-solid.svg';
const iconTime = '//static.icos-cp.eu/images/icons/time.svg';
const iconFile = '//static.icos-cp.eu/images/icons/file.svg';
const iconCalendar = '//static.icos-cp.eu/images/icons/calendar-alt-regular.svg';

interface OurProps {
	objInfo: ObjectsTable | CartItem
	viewMetadata: (doj: string) => void
	extendedInfo: ExtendedDobjInfo
	preview: Preview
	updateCheckedObjects: (ids: string) => void
	isChecked: boolean
	checkedObjects?: ObjectsTable[]
	labelLookup: any
}

export default class SearchResultRegularRow extends Component<OurProps> {
	handleViewMetadata(ev: MouseEvent){
		if (!ev.ctrlKey && !ev.metaKey && this.props.objInfo.dobj) {
			ev.preventDefault();
			this.props.viewMetadata(this.props.objInfo.dobj);
		}
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const extendedInfo = props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: { ...props.extendedInfo, theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg' }
		const specLabel = props.labelLookup[objInfo.spec] ?? "";
		const title = extendedInfo.title ?? makeL2OrLessTitle(extendedInfo, specLabel);
		const samplingHeight = extendedInfo.samplingHeight ? extendedInfo.samplingHeight + ' meters' : undefined;
		const checkboxDisabled = objInfo.level === 0;
		const checkBtnTitle = checkboxDisabled
			? 'You cannot download or preview level 0 data through this portal'
			: `Click to select this data object for preview or add to cart`;

		return(
			<tr style={{margin: '20px 0'}}>
				<td style={{textAlign: 'center', width: 30, padding: '16px 0px'}}>
					<CheckBtn
						onClick={() => props.updateCheckedObjects(objInfo.dobj)}
						title={checkBtnTitle}
						isChecked={props.isChecked}
						checkboxDisabled={checkboxDisabled}
					/>
				</td>
				<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 style={{marginTop: 0}}>
						<a title="View metadata" href={getMetadataHash(objInfo.dobj)} onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{title}</a>
					</h4>
					<Description extendedInfo={extendedInfo} truncateStyle={truncateStyle} />
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} />
						{config.features.displayStationInExtendedInfo && extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={iconStation} iconHeight={16} />
						}
						{config.features.displayFileNameInExtendedInfo && objInfo.fileName &&
						<ExtendedInfoItem item={objInfo.fileName} icon={iconFile} iconHeight={16} title="File name" />
						}
						<ExtendedInfoItem item={samplingHeight} icon={iconArrows} iconHeight={15} title="Sampling height" />
						<ExtendedInfoItem item={objInfo.temporalResolution} icon={iconTime} iconHeight={16} title="Time resolution" />
						{extendedInfo.biblioInfo &&
						<ExtendedInfoItem item={extendedInfo.biblioInfo.temporalCoverageDisplay} icon={iconCalendar} iconHeight={12} iconRightMargin={2} title="Temporal coverage" />
						}
					</div>
				</td>
			</tr>
		);
	}
}

const makeL2OrLessTitle = (extendedInfo: ExtendedDobjInfo, specLabel: String) => {
	const location = extendedInfo.samplingPoint ?? extendedInfo.site ?? extendedInfo.station?.trim();

	if (config.features.shortenDataTypeLabel && specLabel.includes(',')) specLabel.substr(0, specLabel.indexOf(','))

	return `${specLabel} from ${location}`
}

export const getMetadataHash = (dobj: string) => {
	const hashObj = {
		route: 'metadata',
		id: getLastSegmentInUrl(dobj)
	};

	return "#" + encodeURIComponent(JSON.stringify(hashObj));
};

const Description: React.FunctionComponent<{
	extendedInfo: Partial<ExtendedDobjInfo> | undefined,
	truncateStyle: CSSProperties
}> = ({ extendedInfo, truncateStyle}) => {
	if (!(extendedInfo && extendedInfo.description)) return null;

	return isSmallDevice()
		? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
		: <LinkifyText text={extendedInfo.description} style={linesToShowStyle(5)} />;
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
