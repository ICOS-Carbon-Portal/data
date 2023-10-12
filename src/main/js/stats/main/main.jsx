import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './containers/Root.jsx';
import './stats.css';

const container = document.getElementById('main');
const root = createRoot(container);

root.render(<Root />);
