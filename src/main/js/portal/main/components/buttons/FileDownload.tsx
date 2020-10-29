import React, { useState } from 'react';

interface Props {
	getAllFilteredDataObjects: () => void
	csvData: Blob
}

export const FileDownload = (props: Props) => {
	const { getAllFilteredDataObjects, csvData } = props;
	const [blob, setBlob] = useState(csvData);
	const [isProcessing, setProcessing] = useState(false);

	const downloadFileClick = () => {
		setProcessing(true);
		getAllFilteredDataObjects();
	}

	if (blob !== csvData) {
		setBlob(csvData);
		setProcessing(false);

		const lnk = document.createElement("a");
		lnk.href = window.URL.createObjectURL(csvData);
		lnk.download = "Carbon Portal Search Result.csv";
		lnk.click();
	}

	if (isProcessing)
		return <span style={{ marginLeft: 10}}>Processing...</span>;

	else
		return <a style={{ marginLeft: 10, cursor: 'pointer' }} onClick={downloadFileClick}>Save result to CSV</a>;
};
