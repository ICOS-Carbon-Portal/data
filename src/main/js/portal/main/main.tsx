import React from 'react';
import * as Sentry from '@sentry/browser';
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
	});
}

const container = document.getElementById('main');
const root = createRoot(container!);

root.render(<Root />);
