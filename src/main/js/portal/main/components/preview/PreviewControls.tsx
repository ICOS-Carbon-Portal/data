import React, { Component } from 'react';
import { UrlStr } from '../../backend/declarations';
import { PreviewType, iframeEmbedSize } from '../../config';
import HelpButton from '../../containers/help/HelpButton';
import CopyValue from '../controls/CopyValue';

interface OurProps {
	iframeUrl: UrlStr | ''
	previewType: PreviewType
	csvDownloadUrl?: string
	chartType?: 'line' | 'scatter'
	chartTypeAction?: (type: 'line' | 'scatter') => void
}

export default class PreviewControls extends Component<OurProps>{

	render() {
		const { iframeUrl, previewType, csvDownloadUrl, chartType, chartTypeAction } = this.props;
		const { width, height } = iframeEmbedSize[previewType]
		const codeToEmbed = `<iframe width="${width}" height="${height}" frameborder="0" src="${iframeUrl}"></iframe>`;

		return(
			<div className="col-auto ms-auto d-flex gap-2">
				{chartType && chartTypeAction &&
					<div className="btn-group" role="group" aria-label="Toggle between scatter and line charts">
						<input type="radio" className="btn-check" name="chart-type" id="scatter-chart" autoComplete="off" onChange={() => chartTypeAction('line')} checked={chartType == 'scatter'} />
						<label className="btn btn-outline-secondary d-flex align-items-center" htmlFor="scatter-chart" title="View scatter chart">
							<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill='currentColor' className='me-2'>
								<path d="m288 288c17.674 0 32-14.328 32-32 0-17.674-14.326-32-32-32s-32 14.326-32 32c0 17.672 14.326 32 32 32zm96 64c17.674 0 32-14.328 32-32 0-17.674-14.326-32-32-32s-32 14.326-32 32c0 17.672 14.326 32 32 32zm32-192c17.674 0 32-14.328 32-32 0-17.674-14.326-32-32-32s-32 14.326-32 32c0 17.672 14.326 32 32 32zm72 272h-440v-376c0-13.256-10.746-24-24-24s-24 10.744-24 24v392c0 17.6 14.4 32 32 32h456c13.254 0 24-10.746 24-24 0-13.256-10.746-24-24-24zm-296-240c17.674 0 32-14.328 32-32 0-17.674-14.326-32-32-32s-32 14.326-32 32c0 17.672 14.326 32 32 32zm-32 160c17.674 0 32-14.328 32-32 0-17.674-14.326-32-32-32s-32 14.326-32 32c0 17.672 14.326 32 32 32z" />
							</svg>
							Scatter
						</label>
						<input type="radio" className="btn-check" name="chart-type" id="line-chart" autoComplete="off" onChange={() => chartTypeAction('scatter')} checked={chartType == 'line'} />
						<label className="btn btn-outline-secondary d-flex align-items-center" htmlFor="line-chart" title="View line chart">
							<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill='currentColor' className='me-2'>
								<path d="m144.953 304.953 63.047-63.031 79.047 79.031c4.672 4.672 10.812 7.047 16.953 7.047s12.281-2.344 16.953-7.047l152.018-151.986c9.375-9.375 9.371-24.576-.008-33.946-9.371-9.365-24.561-9.361-33.928.008l-135.035 135.018-79.053-79.006c-9.375-9.371-24.574-9.367-33.947.006l-80 80c-9.375 9.375-9.375 24.562 0 33.953 9.391 9.375 24.578 9.344 33.953-.047zm343.047 127.047h-440v-376c0-13.25-10.75-24-24-24s-24 10.75-24 24v392c0 17.594 14.406 32 32 32h456c13.25 0 24-10.75 24-24s-10.75-24-24-24z" />
							</svg>
							Line
						</label>
					</div>
				}
				<a className='btn btn-outline-secondary' href={iframeUrl}>
					<i className="fas fa-expand-arrows-alt" title="View full screen"></i>
				</a>
				<details className="dropdown-details">
					<summary className='summary-button'>Use preview data <i className='fas fa-chevron-down px-1' style={{fontSize: '0.8rem'}}></i></summary>
					<div className='dropdown' style={{ width: 360, right: 0 }}>
						<div className='p-3 border-bottom'>
							<p>Embed preview</p>
							<EmbedPreview url={codeToEmbed} />
						</div>
						{csvDownloadUrl &&
						<div className='p-3'>
							<div className='mb-2'>
								<span>Access preview data as CSV</span>
								<span className='float-end'>
									<HelpButton name="previewCsvDownload" title="Click to toggle help" overrideStyles={{ padding: 5 }} />
								</span>
							</div>
							<div className='mb-2 text-muted' style={{fontSize: "0.875rem"}}>For advanced use, such as parsing the data with a program. Please read the help for more information.</div>
							<CsvDownloadCopyValue downloadUrl={csvDownloadUrl} />
						</div>
						}
					</div>
				</details>
			</div>
		)
	}
}

const EmbedPreview = ({ url }: { url: string }) => {
	if (url === '') return null;

	return (
		<div style={{ display: 'block', whiteSpace: 'nowrap' }}>
			<CopyValue
				btnText="Copy"
				copyHelpText="Click to copy the code to embed the preview"
				valToCopy={url}
			/>
		</div>
	);
};

const CsvDownloadCopyValue = ({ downloadUrl }: { downloadUrl: string }) => {
	if (downloadUrl === '') return null;

	return (
		<div style={{ display: 'block', whiteSpace: 'nowrap' }}>
			<CopyValue
				btnText="Copy preview CSV download URL"
				copyHelpText="Click to copy download URL to clipboard"
				valToCopy={downloadUrl}
			/>
		</div>
	);
};
