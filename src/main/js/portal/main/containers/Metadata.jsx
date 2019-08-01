import React, { Component } from 'react';
import CartBtn from '../components/buttons/CartBtn.jsx';
import PreviewBtn from '../components/buttons/PreviewBtn.jsx';
import { formatBytes, formatDate, formatDateTime } from '../utils';
import commonConfig from '../../../common/main/config';

export default class Metadata extends Component {
	constructor(props) {
		super(props);
	}

	handleAddToCart(objInfo) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo) {
		this.props.removeFromCart(objInfo);
	}

	handlePreview(id){
		this.props.setPreviewItem(id);
	}

	handleViewMetadata(id) {
		this.props.setMetadataItem(id);
	}

	render() {
		const { metadata, cart, lookup } = this.props;
		const isInCart = cart.hasItem(metadata.id);
		const actionButtonType = isInCart ? 'remove' : 'add';
		const buttonAction = isInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);
		const station = metadata && metadata.specificInfo && metadata.specificInfo.acquisition && metadata.specificInfo.acquisition.station;
		const [isCartEnabled, cartTitle] = metadata.specification ? cartState(metadata.specification.dataLevel, metadata.nextVersion) : [];

		return (
			<div>
				{metadata && metadata.submission &&
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
								{metadata.specificInfo.description &&
									metadataRow("Description", metadata.specificInfo.description)
								}
								{metadata.doi &&
									metadataRow("DOI", doiLink(metadata.doi))
								}
								{metadata.pid &&
									metadataRow("PID", <a href={`https://hdl.handle.net/${metadata.pid}`}>{metadata.pid}</a>)
								}
								{metadataRow("Affiliation", metadata.specification.project.label)}
								{metadataRow("Type", metadata.specification.self.label)}
								{metadataRow("Level", metadata.specification.dataLevel)}
								{metadataRow("File name", metadata.fileName)}
								{metadataRow("Size", formatBytes(metadata.size, 0))}
								<br />
								{metadata.specificInfo.acquisition &&
									<React.Fragment>
										{station && metadataRow("Station", <a href={station.org.self.uri}>{station.name}</a>)}
										{metadataRow("Time coverage", `${formatDateTime(new Date(metadata.specificInfo.acquisition.interval.start))}
										\u2013
										${formatDateTime(new Date(metadata.specificInfo.acquisition.interval.stop))}`)}
										{metadata.specificInfo.acquisition.instrument &&
											instrumentRow(metadata.specificInfo.acquisition.instrument)
										}
										{metadata.specificInfo.acquisition.samplingHeight &&
											metadataRow("Sampling height", `${metadata.specificInfo.acquisition.samplingHeight} m`)
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

								{metadata.previousVersion &&
									<React.Fragment>
										{metadataRow("Previous version", <a onClick={this.handleViewMetadata.bind(this, metadata.previousVersion)} style={{cursor: 'pointer'}}>View previous version</a>)}
										<br />
									</React.Fragment>
								}
								{metadata.specificInfo.productionInfo &&
									<React.Fragment>
										{metadataRow("Made by", creatorLink(metadata.specificInfo.productionInfo.creator))}
										{metadata.specificInfo.productionInfo.contributors.length > 0 &&
											metadataRow("Contributors", metadata.specificInfo.productionInfo.contributors.map((contributor, index) => {
												return(
													<span key={contributor.self.uri}>
														<a href={contributor.self.uri}>
															{contributor.firstName} {contributor.lastName}
														</a>
														{index != metadata.specificInfo.productionInfo.contributors.length - 1 && ', '}
													</span>);
											}))
										}
										{metadata.specificInfo.productionInfo.host &&
											metadataRow("Host organization", <a href={metadata.specificInfo.productionInfo.host.self.uri}>{metadata.specificInfo.productionInfo.host.name}</a>)
										}
										{metadata.specificInfo.productionInfo.comment && metadataRow("Comment", metadata.specificInfo.productionInfo.comment)}
										{metadataRow("Creation date", formatDateTime(new Date(metadata.specificInfo.productionInfo.dateTime)))}
									</React.Fragment>
								}
							</div>
							<div className="col-sm-4">
								{metadata.coverageGeoJson &&
									<React.Fragment>
										<div className="row">
											<div className="col-md-12">
												{map(metadata.specification.theme.markerIcon, metadata.coverageGeoJson)}
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

export const MetadataTitle = props => {
	const { metadata } = props;
	const station = metadata && metadata.specificInfo && metadata.specificInfo.acquisition && metadata.specificInfo.acquisition.station;
	return (
		<React.Fragment>
			{metadata && metadata.specificInfo &&
				<h1>
					{metadata.specificInfo.title || metadata.specification.self.label}
					{station && <span> from {station.name}</span>}
					{metadata.specificInfo.acquisition &&
						caption(new Date(metadata.specificInfo.acquisition.interval.start), new Date(metadata.specificInfo.acquisition.interval.stop))
					}
				</h1>
			}
		</React.Fragment>
	);
};

const caption = (startDate, stopDate) => {
	return (
		<div className="text-muted">
			<small>{formatDate(startDate)}{areDatesDifferent(startDate, stopDate) && ` \u2013 ${formatDate(stopDate)}`}</small>
		</div>
	);
};

const areDatesDifferent = (date1, date2) => {
	return date1.setUTCHours(0,0,0,0) != date2.setUTCHours(0,0,0,0) ? true : false;
};

const metadataRow = (label, value) => {
	return (
		<div className="row">
			<div className="col-md-2"><label>{label}</label></div>
			<div className="col-md-10 mb-2">{value}</div>
		</div>
	);
};

const doiLink = (doi) => {
	return (
		<span>
			<a href={`https://doi.org/${doi}`}>{doi}</a>&nbsp;
			(<a target="_blank" href={`https://search.datacite.org/works/${doi}`}>metadata</a>)
		</span>
	);
};

const instrumentRow = (instruments) => {
	return(
		Array.isArray(instruments)
			? metadataRow("Instruments", instruments.map((instrument, index) => {
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

const metadataLinks = (id, fileName) => {
	const json = `${id}/${fileName}.json`;
	const xml = `${id}/${fileName}.xml`;
	const turtle = `${id}/${fileName}.ttl`;
	return (
		<div>
			<a href={id}>HTML landing page</a> &#8226; <a href={json}>JSON</a> &#8226; <a href={xml}>RDF/XML</a> &#8226; <a href={turtle}>RDF/TURTLE</a>
		</div>
	);
};

const map = (icon, coverage) => {
	const style = { border: '1px solid #ddd', width: '100%', height: '400px' };
	return (
		<iframe src={`${commonConfig.metaBaseUri}station/?icon=${icon != undefined ? icon : ""}&coverage=${coverage}`} style={style}></iframe>
	);
};

const creatorLink = (creator) => {
	return creator.name ? <a href={creator.self.uri}>{creator.name}</a> : <a href={creator.self.uri}>{creator.firstName} {creator.lastName}</a>;
};

const cartState = (dataLevel, nextVersion) => {
	if (dataLevel == 0) {
		return [false, "Data level 0 is available on demand only"];
	} else if (nextVersion) {
		return [false, "You can only download the newest version"];
	} else {
		return [true, ""];
	}
};
