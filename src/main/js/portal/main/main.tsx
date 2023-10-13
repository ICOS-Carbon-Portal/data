import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './containers/Root';

import './portal.scss';
import './ol-custom.css';
import '../node_modules/react-widgets/scss/styles.scss';
import '../node_modules/react-widgets/scss/multiselect.scss';
import '../node_modules/ol/ol.css';
import 'react-datepicker/dist/react-datepicker.css';


const container = document.getElementById('main');
const root = createRoot(container!);

root.render(<Root />);
