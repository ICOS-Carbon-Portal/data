import React, { Component, ReactElement } from 'react';
import { connect } from 'react-redux';
import CartBtn from '../components/buttons/CartBtn.jsx';
import PreviewBtn from '../components/buttons/PreviewBtn.jsx';
import { formatBytes, formatDate, formatDateTime } from '../utils';
import commonConfig from '../../../common/main/config';
import {LinkifyText} from "../components/LinkifyText";
import {MetaDataObject, State} from "../models/State";
import {PortalDispatch} from "../store";
import {addToCart, removeFromCart, setMetadataItem, setPreviewItem, updateFilteredDataObjects} from "../actions";
import {Sha256Str, UrlStr} from "../backend/declarations";
import {Agent, L2OrLessSpecificMeta, L3SpecificMeta, Organization, Person} from "../../../common/main/metacore";
import config from '../config';


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type MetadataProps = StateProps & DispatchProps;

class Metadata extends Component<MetadataProps> {
	constructor(props: MetadataProps) {
		super(props);
	}

	handleAddToCart(ids: UrlStr[]) {
		this.props.addToCart(ids);
	}

	handleRemoveFromCart(ids: UrlStr[]) {
		this.props.removeFromCart(ids);
	}

	handlePreview(ids: UrlStr[]){
		this.props.setPreviewItem(ids);
	}

	handleViewMetadata(id: UrlStr) {
		this.props.setMetadataItem(id);
		this.props.updateFilteredDataObjects();
	}

	render() {
		const { metadata, cart, lookup } = this.props;

		if (metadata === undefined) return null;

		const isInCart = cart.hasItem(metadata.id);
		const actionButtonType = isInCart ? 'remove' : 'add';
		const buttonAction = isInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);
		const specInfo = metadata.specificInfo

		const acquisition = (specInfo as L2OrLessSpecificMeta).acquisition
			? (specInfo as L2OrLessSpecificMeta).acquisition
			: undefined;
		const productionInfo = (specInfo as L3SpecificMeta).productionInfo
			? (specInfo as L3SpecificMeta).productionInfo
			: undefined;
		const station = (specInfo as L2OrLessSpecificMeta).acquisition && (specInfo as L2OrLessSpecificMeta).acquisition.station;
		const [isCartEnabled, cartTitle] = metadata.specification ? cartState(metadata.specification.dataLevel, metadata.nextVersion) : [];
		const prevVersions = Array.isArray(metadata.previousVersion)
			? metadata.previousVersion
			: metadata.previousVersion ? [metadata.previousVersion] : [];
		const self = this;

		return (
			<div>
				{metadata.submission &&
					<div>
						{metadata.submission.stop ? null :
							<div className="alert alert-warning">Upload not complete, data is missing.</div>
						}
						{metadata.nextVersion &&
							<div className="alert alert-warning">A newer version of this data is available: <a onClick={this.handleViewMetadata.bind(this, metadata.nextVersion)} style={{cursor: 'pointer'}} className="alert-link">View next version</a></div>
						}
						<div className="row">
							<div className="col-sm-8">
								<div className="row">
									<div className="col-md-2">
									</div>
									<div className="col-md-10">
										<CartBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[metadata.id]}
											clickAction={buttonAction}
											enabled={isCartEnabled}
											type={actionButtonType}
											title={cartTitle}
										/>
										<PreviewBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[{'dobj': metadata.id, 'spec': metadata.specification.self.uri, 'nextVersion': metadata.nextVersion}]}
											clickAction={this.handlePreview.bind(this)}
											lookup={lookup}
										/>
									</div>
								</div>
								{(specInfo as L3SpecificMeta).description &&
									metadataRow("Description", (specInfo as L3SpecificMeta).description!, true)
								}
								{metadata.doi &&
									metadataRow("DOI", doiLink(metadata.doi))
								}
								{metadata.pid &&
									metadataRow("PID", <a href={`https://hdl.handle.net/${metadata.pid}`}>{metadata.pid}</a>)
								}
								{metadata.specification.project.label && metadataRow("Affiliation", metadata.specification.project.label)}
								{metadata.specification.self.label && metadataRow("Type", metadata.specification.self.label)}
								{metadataRow("Level", metadata.specification.dataLevel.toString())}
								{metadataRow("File name", metadata.fileName)}
								{metadata.size !== undefined && metadataRow("Size", formatBytes(metadata.size, 0))}
								<br />
								{acquisition &&
									<React.Fragment>
										{station && metadataRow("Station", <a href={station.org.self.uri}>{station.name}</a>)}
										{station && station.responsibleOrganization &&
											metadataRow("Responsible organization", <a href={station.responsibleOrganization.self.uri}>{station.responsibleOrganization.name}</a>)
										}
										{acquisition.site && acquisition.site.ecosystem.label &&
											metadataRow("Ecosystem", acquisition.site.ecosystem.label)
										}
										{acquisition.interval && metadataRow("Time coverage", `${formatDateTime(new Date(acquisition.interval.start))}
										\u2013
										${formatDateTime(new Date(acquisition.interval.stop))}`)}
										{acquisition.instrument &&
											instrumentRow(acquisition.instrument)
										}
										{acquisition.samplingHeight &&
											metadataRow("Sampling height", `${acquisition.samplingHeight} m`)
										}
										<br />
									</React.Fragment>
								}
								{metadata.citationString &&
									<React.Fragment>
										{metadataRow("Citation", metadata.citationString)}
										<br />
									</React.Fragment>
								}

								{prevVersions.map((previousVersion, i) =>
									<React.Fragment key={"key_" + i}>
										{metadataRow(
											"Previous version",
											<a onClick={self.handleViewMetadata.bind(self, previousVersion)} style={{cursor: 'pointer'}}>View previous version</a>
										)}
									</React.Fragment>
								)}
								{prevVersions.length > 0 && <br />}
								{productionInfo &&
									<React.Fragment>
										{metadataRow("Made by", creatorLink(productionInfo.creator))}
										{productionInfo.contributors.length > 0 &&
											metadataRow("Contributors", productionInfo.contributors.map((contributor, index) => {
												const name = (contributor as Organization).name
													? (contributor as Organization).name
													: `${(contributor as Person).firstName} ${(contributor as Person).lastName}`;

												return(
													<span key={contributor.self.uri}>
														<a href={contributor.self.uri}>
															{name}
														</a>
														{index != productionInfo.contributors.length - 1 && ', '}
													</span>);
											}))
										}
										{productionInfo.host &&
											metadataRow("Host organization", <a href={productionInfo.host.self.uri}>{productionInfo.host.name}</a>)
										}
										{productionInfo.comment && metadataRow("Comment", productionInfo.comment)}
										{metadataRow("Creation date", formatDateTime(new Date(productionInfo.dateTime)))}
									</React.Fragment>
								}
							</div>
							<div className="col-sm-4">
								{metadata.coverageGeoJson &&
									<React.Fragment>
										<div className="row">
											<div className="col-md-12">
												{map(metadata.coverageGeoJson, metadata.specification.theme.markerIcon)}
											</div>
										</div>
										<br />
									</React.Fragment>
								}
								<div className="row">
									<div className="col-md-12">
										<label>Metadata</label>
										{metadataLinks(metadata.id, metadata.fileName)}
									</div>
								</div>
							</div>
						</div>
					</div>
				}
			</div>
		);
	}
}

export const MetadataTitle = (metadata?: MetaDataObject & {id: UrlStr}) => {
	if (metadata === undefined) return null;

	const specInfo = metadata.specificInfo
	const acquisition =  (specInfo as L2OrLessSpecificMeta).acquisition
		? (specInfo as L2OrLessSpecificMeta).acquisition
		: undefined;
	const station = acquisition && acquisition.station
		? acquisition.station
		: undefined;
	const title = (specInfo as L3SpecificMeta).title
		? (specInfo as L3SpecificMeta).title
		: undefined;
	let specLabel = metadata.specification.self.label ?? "";
	if(config.envri === "SITES" && specLabel.includes(',')) specLabel = specLabel.substr(0, specLabel.indexOf(','));

	return (
		<React.Fragment>
			{specInfo &&
				<h1>
					{title || specLabel}
					{station && <span> from {station.name}</span>}
					{acquisition && acquisition.interval &&
						caption(new Date(acquisition.interval.start), new Date(acquisition.interval.stop))
					}
				</h1>
			}
		</React.Fragment>
	);
};

const caption = (startDate: Date, stopDate: Date) => {
	return (
		<div className="text-muted">
			<small>{formatDate(startDate)}{areDatesDifferent(startDate, stopDate) && ` \u2013 ${formatDate(stopDate)}`}</small>
		</div>
	);
};

const areDatesDifferent = (date1: Date, date2: Date) => {
	return date1.setUTCHours(0, 0, 0, 0) !== date2.setUTCHours(0, 0, 0, 0);
};

const metadataRow = (label: string, value: string | ReactElement | ReactElement[], linkify = false) => {
	const text = linkify && typeof value === "string"
		? <LinkifyText text={value} />
		: value;

	return (
		<div className="row">
			<div className="col-md-2"><label>{label}</label></div>
			<div className="col-md-10 mb-2">{text}</div>
		</div>
	);
};

const doiLink = (doi: string) => {
	return (
		<span>
			<a href={`https://doi.org/${doi}`}>{doi}</a>&nbsp;
			(<a target="_blank" href={`https://search.datacite.org/works/${doi}`}>metadata</a>)
		</span>
	);
};

const instrumentRow = (instruments: UrlStr  | UrlStr[]) => {
	return(
		Array.isArray(instruments)
			? metadataRow("Instruments", instruments.map((instrument: UrlStr, index) => {
				return(
					<span key={instrument}>
						<a href={instrument}>{instrument.split('/').pop()}</a>
						{index != instruments.length - 1 && ', '}
					</span>
				);
			}))
			: metadataRow("Instrument", <a href={instruments}>{instruments.split('/').pop()}</a>)
	);
};

const metadataLinks = (id: Sha256Str, fileName: string) => {
	const json = `${id}/${fileName}.json`;
	const xml = `${id}/${fileName}.xml`;
	const turtle = `${id}/${fileName}.ttl`;
	return (
		<div>
			<a href={id}>HTML landing page</a> &#8226; <a href={json}>JSON</a> &#8226; <a href={xml}>RDF/XML</a> &#8226; <a href={turtle}>RDF/TURTLE</a>
		</div>
	);
};

const map = (coverage: string, icon?: string) => {
	const style = { border: '1px solid #ddd', width: '100%', height: '400px' };
	return (
		<iframe src={`${commonConfig.metaBaseUri}station/?icon=${icon != undefined ? icon : ""}&coverage=${coverage}`} style={style}></iframe>
	);
};

const creatorLink = (creator: Agent) => {
	return (creator as Organization).name
		? <a href={creator.self.uri}>{(creator as Organization).name}</a> :
		<a href={creator.self.uri}>{(creator as Person).firstName} {(creator as Person).lastName}</a>;
};

const cartState = (dataLevel: number, nextVersion?: UrlStr) => {
	if (dataLevel == 0) {
		return [false, "Data level 0 is available on demand only"];
	} else if (nextVersion) {
		return [false, "You can only download the newest version"];
	} else {
		return [true, ""];
	}
};

function stateToProps(state: State){
	return {
		cart: state.cart,
		lookup: state.lookup,
		metadata: state.metadata,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setPreviewItem: (id: UrlStr[]) => dispatch(setPreviewItem(id)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		updateFilteredDataObjects: () => dispatch(updateFilteredDataObjects)
	};
}

export default connect(stateToProps, dispatchToProps)(Metadata);
