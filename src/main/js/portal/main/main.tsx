import React from 'react';
import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import config from './config';
import Root from './containers/Root';

import './portal.scss';
import './ol-custom.css';
import '../node_modules/react-widgets/scss/styles.scss';
import '../node_modules/react-widgets/scss/multiselect.scss';
import '../node_modules/ol/ol.css';
import 'react-datepicker/dist/react-datepicker.css';

if (config.sentry.dsn) {
	Sentry.init({
		dsn: config.sentry.dsn,
		allowUrls: [
			/^https:\/\/([a-z0-9-]+\.)+icos-cp\.eu\//i,
			/^https:\/\/([a-z0-9-]+\.)+fieldsites\.se\//i,
		],
	});
}

const container = document.getElementById('main');
const root = createRoot(container!);

root.render(<Root />);
