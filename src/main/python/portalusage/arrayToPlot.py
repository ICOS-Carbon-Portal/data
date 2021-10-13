#!/usr/bin/env python

import matplotlib.pyplot as plt
from matplotlib.dates import DayLocator
import requests
import numbers
import os
import locale


locale.setlocale(locale.LC_ALL, '')

def get_response(url):
	return requests.get(url, timeout=15)


def parse_response(resp):
	xLabel = 'X axis'
	yLabel = 'Y axis'
	x = []
	y = []

	for rec in resp.json():
		for key in rec:
			if isinstance(rec[key], numbers.Number):
				yLabel = key
				y.append(rec[key])
			else:
				xLabel = key
				x.append(rec[key])
	
	return (xLabel, yLabel, x[::-1], y[::-1])


def plt_set_fullscreen(plt):
    backend = str(plt.get_backend())
    mgr = plt.get_current_fig_manager()
    if backend == 'TkAgg':
        if os.name == 'nt':
            mgr.window.state('zoomed')
        else:
            mgr.resize(*mgr.window.maxsize())
    elif backend == 'wxAgg':
        mgr.frame.Maximize(True)
    elif backend == 'Qt4Agg':
        mgr.window.showMaximized()


def plot_response(plot_type, xLabel, yLabel, x, y):
	fig, ax = plt.subplots()

	if (plot_type == 'bar'):
		ax.bar(x, y)
	else:
		ax.plot(x, y)

	plt.xlabel(xLabel, fontsize=13)
	plt.ylabel(yLabel, fontsize=13)

	ax.format_coord = lambda xVal, yVal: f'{xLabel}={x[round(xVal)]}, {yLabel}={locale.format_string("%d", round(yVal), grouping=True)}'

	plt_set_fullscreen(plt)

	ax.set_xlim(x[0], x[-1])
		
	ax.xaxis.set_major_locator(DayLocator())
	fig.autofmt_xdate()

	plt.show()


def get_url():
	val = input(get_multiline_input_txt(['Enter 1 to show portal filter changes','Enter 2 to show portal usage per month',  'Enter 3 to provide other url to restheart', 'Default is 2 - portal usage per month']))
	
	url = {
        '1': 'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getFilterChanges?np',
        '2': 'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?np',
		'3': None
    }.get(val, 'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?np')

	if url == None:
		url = input(get_multiline_input_txt(['Provide a URL that returns an array of objects. The objects must be 2 key values where one of the values are numeric.']))
	
	return url


def get_plot_type():
	plot_type = input(get_multiline_input_txt(['Enter 1 to use line', 'Enter 2 to use bar', 'Default is 1 - line']))
	if plot_type == '2':
		return 'bar'
	else:
		return 'line'


def get_multiline_input_txt(txt):
	return '\n' + '\n'.join(txt) + '\n>> '

url = get_url()

if url.startswith('http'):
	plot_type = get_plot_type()

	print(f'Fetching from {url}\nWait for plot to show...')

	(xLabel, yLabel, x, y) = parse_response(get_response(url))
	plot_response(plot_type, xLabel, yLabel, x, y)

else:
	print(f'You provided "{url}" which is not a valid url.')
