import React from 'react';
import {render} from 'react-dom';
import Root from './containers/Root';

import './portal.scss';
import './ol-custom.css';
import './bootstrap-upgrade.css';
import '../node_modules/react-widgets/scss/styles.scss';
import '../node_modules/react-widgets/scss/multiselect.scss';
import '../node_modules/ol/ol.css';
import '../node_modules/rc-datepicker/lib/style.css';


render(
	<Root />,
	document.getElementById('main')
);
