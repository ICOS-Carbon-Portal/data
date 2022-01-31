import React, {ChangeEvent, Component, ReactNode} from 'react';
import {connect} from "react-redux";
import PreviewTimeSerie from '../components/preview/PreviewTimeSerie';
import PreviewSelfContained from '../components/preview/PreviewSelfContained';
import CopyValue from '../components/controls/CopyValue';
import config, { PreviewType } from '../config';
import CartBtn from '../components/buttons/CartBtn';
import {Events} from 'icos-cp-utils';
import {State} from "../models/State";
import {UrlStr} from "../backend/declarations";
import CartItem, { addingToCartProhibition } from "../models/CartItem";
import {PortalDispatch} from "../store";
import {addToCart, removeFromCart, setMetadataItem, setPreviewUrl} from "../actions/common";
import {storeTsPreviewSetting} from "../actions/preview";
import { isDefined, pick } from "../utils";
import commonConfig from '../../../common/main/config';
import TableFormatCache from '../../../common/main/TableFormatCache';
import { lastUrlPart, TableFormat } from 'icos-cp-backend';
import PreviewObj from '../models/Preview';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & { HelpSection: ReactNode }
interface OurState {
	iframeSrc: UrlStr | ''
	tableFormat?: TableFormat
}

class Preview extends Component<OurProps, OurState> {
	private events: typeof Events = null;
	private tfCache: TableFormatCache = new TableFormatCache(commonConfig);

	constructor(props: OurProps){
		super(props);

		this.state = {
			iframeSrc: '',
			tableFormat: undefined
		};

		this.events = new Events();
		this.events.addToTarget(window, "message", this.handleIframeSrcChange.bind(this));
	}

	getTableFormat(previewType: PreviewType, idx: number = 0) {
		if (previewType !== config.TIMESERIES) return;

		const preview = this.props.preview;
		if (preview.items.length === 0 || this.tfCache.isInCache(preview.items[idx].spec)) return;

		this.tfCache.getTableFormat(preview.items[idx].spec)
			.then(tableFormat => this.setState({ tableFormat }));
	}

	handleIframeSrcChange(event: ChangeEvent<HTMLIFrameElement> | MessageEvent){
		const iframeSrc = event instanceof MessageEvent
			? event.data
			: event.target.src;

		if (typeof iframeSrc === "string") {
			this.setState({iframeSrc});
			this.props.setPreviewUrl(iframeSrc);
		}
	}

	handleAddToCart(objInfo: UrlStr[]) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo: UrlStr[]) {
		this.props.removeFromCart(objInfo);
	}

	handleViewMetadata(id: UrlStr) {
		this.props.setMetadataItem(id);
	}

	componentWillUnmount(){
		this.events.clear();
	}

	render(){
		const { HelpSection, preview, cart } = this.props;
		const { tableFormat, iframeSrc } = this.state;
		const previewType = preview.type;
		if (previewType === undefined) return null;

		this.getTableFormat(previewType);

		const allowCartAdd = preview.items
			.map(item => addingToCartProhibition({level: item.level, theme: item.theme, hasNextVersion: item.hasNextVersion}))
			.every(cartProhibition => cartProhibition.allowCartAdd);
		const uiMessage = allowCartAdd ? "" : "One or more data objects in this preview cannot be downloaded";

		const areItemsInCart: boolean = preview.items.reduce((prevVal: boolean, item: CartItem) => cart.hasItem(item.dobj), false);
		const actionButtonType = areItemsInCart ? 'remove' : 'add';
		const buttonAction = areItemsInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);

		return (
			<>
				{preview
					? <div className="row" style={{ position: 'relative' }}>
						<div style={{ display:'inline-block' }}>
							{HelpSection}
						</div>

						<div className="card p-0">
							<div className="card-header">
								{preview.items.map((item: CartItem) => (
									<span key={item.dobj} style={{marginRight: 10}}>
										<span style={{marginRight: 10}}>
											{item.itemName}
										</span>
										<span onClick={this.handleViewMetadata.bind(this, item.dobj)} style={{cursor: 'pointer'}} className="fas fa-info-circle fs-5" />
									</span>
								))}
							</div>

							<div className="card-body">
								<div className="row mb-3">
									<div className="col-sm-10">
										<UrlPresenters previewType={previewType} preview={preview} tableFormat={tableFormat} iframeSrc={iframeSrc} />
									</div>

									{preview.items &&
									<div className="col-sm-2">
										<CartBtn
											style={{float: 'right', marginBottom: 10}}
											checkedObjects={preview.items.map((item: CartItem) => item.dobj)}
											clickAction={buttonAction}
											enabled={allowCartAdd}
											title={uiMessage}
											type={actionButtonType}
										/>
									</div>
									}
								</div>

								<PreviewRoute
									iframeSrcChange={this.handleIframeSrcChange.bind(this)}
									{...this.props}
								/>
							</div>
						</div>
					</div>
					: null
				}</>
		);
	}
}

type URLPresenters = {
	previewType: PreviewType
	preview: PreviewObj
	tableFormat?: TableFormat
	iframeSrc: string
}
const UrlPresenters = ({ previewType, preview, tableFormat, iframeSrc}: URLPresenters) => {
	const previewLinkPresenter = (
		<CopyValue
			btnText="Copy preview chart URL"
			copyHelpText="Click to copy preview chart URL to clipboard"
			valToCopy={previewUrl(preview.items[0], previewType, iframeSrc)}
			helpButtonName="previewURL"
		/>
	);
	if (previewType === 'TIMESERIES') {
		return (
			<div className="row">
				<div className="col-md-6">
					<CsvDownloadCopyValue downloadUrl={csvDownloadUrl(preview.items[0], previewType, tableFormat)} />
				</div>

				<div className="col-md-6">{previewLinkPresenter}</div>
			</div>
		);
	}

	return previewLinkPresenter;
};

const CsvDownloadCopyValue = ({ downloadUrl }: { downloadUrl: string }) => {
	if (downloadUrl === '') return null;

	return (
		<div style={{ display: 'block', whiteSpace: 'nowrap' }}>
			<CopyValue
				btnText="Copy preview CSV download URL"
				copyHelpText="Click to copy download URL to clipboard"
				valToCopy={downloadUrl}
				helpButtonName="previewCsvDownload"
			/>
		</div>
	);
};

const PreviewRoute = (props: OurProps & {iframeSrcChange: (event: ChangeEvent<HTMLIFrameElement> | MessageEvent) => void}) => {
	const previewType = props.preview.type;

	if (previewType === config.TIMESERIES){
		const tsProps = pick(props, 'preview', 'extendedDobjInfo', 'tsSettings', 'storeTsPreviewSetting', 'iframeSrcChange');
		return <PreviewTimeSerie {...tsProps} />;

	} else if (previewType === config.NETCDF || previewType === config.MAPGRAPH){
		const scProps = pick(props, 'preview', 'iframeSrcChange');
		return <PreviewSelfContained {...scProps} />;

	} else {
		const msg = props.preview.items.length
			? "This type of preview is not yet implemented"
			: "Fetching data for preview...";

		return <div className="card-body">{msg}</div>;
	}
};

function previewUrl(item: CartItem, type: PreviewType, iframeSrc: UrlStr): UrlStr {
	if (type === config.TIMESERIES){
		return (item && item.getUrlSearchValue('x') && item.getUrlSearchValue('y')) ? iframeSrc : '';
	} else {
		return item ? iframeSrc : '';
	}
}

function csvDownloadUrl(item: CartItem, type: PreviewType, tableFormat?: TableFormat): UrlStr {
	if (tableFormat === undefined) return '';

	if (type === config.TIMESERIES) {
		const x = item.getUrlSearchValue('x');
		const y = item.getUrlSearchValue('y');
		const y2 = item.getUrlSearchValue('y2');

		if (x === undefined || (y === undefined && y2 === undefined)) return '';

		const hashId = lastUrlPart(item.dobj);
		const cols = [x, y, y2].filter(isDefined).reduce<string[]>((acc, colName) => {
			acc.push(colName);

			const flagCol = tableFormat.columns.find(col => col.name === colName)?.flagCol;

			if (flagCol !== undefined)
				acc.push(flagCol);

			return acc;
		}, [])
			.map(col => `col=${col}`).join('&');

		const baseUri = new URL('/csv', document.baseURI).href
		return `${baseUri}/${hashId}?${cols}`;
	}

	return '';
}

function stateToProps(state: State){
	return {
		preview: state.preview,
		cart: state.cart,
		extendedDobjInfo: state.extendedDobjInfo,
		tsSettings: state.tsSettings,
		user: state.user
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		setPreviewUrl: (url: UrlStr) => dispatch(setPreviewUrl(url)),
		storeTsPreviewSetting: (spec: string, type: string, val: string) => dispatch(storeTsPreviewSetting(spec, type, val)),
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
	};
}

export default connect(stateToProps, dispatchToProps)(Preview);
