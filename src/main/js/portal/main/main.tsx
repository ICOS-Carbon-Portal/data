import React from 'react';
import {render} from 'react-dom';
import Root from './containers/Root';

import './portal.scss';
import './react-widgets-override.scss';
import './ol-custom.css';
import '../node_modules/react-widgets/lib/scss/react-widgets.scss';
import '../node_modules/ol/ol.css';
import '../node_modules/rc-datepicker/lib/style.css';


render(
	<Root />,
	document.getElementById('main')
);
