import React from 'react';
import { createRoot } from 'react-dom/client';
import Root from './containers/Root.tsx';

const container = document.getElementById('main');
const root = createRoot(container);

root.render(<Root />);
