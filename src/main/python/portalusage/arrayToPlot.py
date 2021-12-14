#!/usr/bin/env python3

from typing import Coroutine, Dict, List, List, Literal, Union
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.dates as mdates
from matplotlib.dates import DayLocator
import datetime as dt
from dateutil.parser import parse
import os
import locale
import numbers
import numpy as np
from numpy import number
from RequestOptions import SelectedOptions, get_request_options
import asyncio
from Backend import Backend


PlotType = Literal['bar', 'line']

locale.setlocale(locale.LC_ALL, '')
request_options = get_request_options()


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


def is_date(string, fuzzy=False):
    try: 
        parse(string, fuzzy=fuzzy)
        return True

    except ValueError:
        return False


def plot_responses(plot_type: PlotType, title: str, data):
	fig, ax = plt.subplots()
	plotter = ax.bar if plot_type == 'bar' else ax.plot
	x_label = data['x_label']
	y_labels = []
	is_x_vals_dates = is_date(data['x_vals'][0])
	x_vals = data['x_vals']
	y_data_dicts = data['y_vals']

	all_y_vals_stacked = []

	red_color = mcolors.TABLEAU_COLORS['tab:red']
	colors = list(mcolors.TABLEAU_COLORS.values()) + ['tomato', 'peachpuff', 'gold', 'palegreen', 'teal', 'lavender']
	colors_wo_red = [color for color in colors if color != red_color]
	
	def get_color(idx: number, label: str):
		if label == 'Error':
			return red_color

		if idx < len(colors_wo_red):
			return colors_wo_red[idx]
		
		return None


	for i, serie_label in enumerate(y_data_dicts.keys()):
		y_labels.append(serie_label)
		y_vals = np.asarray(y_data_dicts[serie_label])
		
		if i == 0:
			bottom = y_vals
			plotter(x_vals, y_vals, label=serie_label)
		
		else:
			plotter(x_vals, y_vals, label=serie_label, color=get_color(i, serie_label), bottom=bottom)
			bottom = bottom + y_vals
		
		all_y_vals_stacked.append(bottom)
	
	y_data = np.array(all_y_vals_stacked)

	plt.title(title.capitalize())
	plt.xlabel(x_label, fontsize=13)

	def format_hover_label(x_label, serie, num):
		return f'{x_label}, {serie}: {locale.format_string("%d", num, grouping=True)}'

	def format_coord_single(x_val, y_val):
		return format_hover_label(x_vals[int(x_val + 0.5)], y_labels[0], y_data[0][int(x_val + 0.5)])

	def format_coord_multiple(x, y):
		col = int(x + 0.5)
		row = int(y + 0.5)
		vals = y_data[:, col]
		val_idx = np.where(vals > row)[0][0] if len(np.where(vals > row)[0]) > 0 else None

		if val_idx is None:
			return ''

		serie = y_labels[val_idx]
		y_val = y_data_dicts[serie][col]

		return format_hover_label(x_vals[col], serie, y_val)
	
	if len(y_data_dicts.keys()) > 1:
		ax.format_coord = format_coord_multiple
		ax.legend()
	else:
		ax.format_coord = format_coord_single
		plt.ylabel(y_labels[0], fontsize=13)

	plt_set_fullscreen(plt)

	ax.set_xlim(x_vals[0], x_vals[-1])
	ax.set_ylim(np.amin(all_y_vals_stacked), np.amax(all_y_vals_stacked), True, True)

	if is_x_vals_dates:
		ax.xaxis.set_major_locator(plt.MaxNLocator(nbins=10))

	fig.autofmt_xdate()

	plt.show()


def get_options() -> SelectedOptions:
	available_options = [o.menu_txt(i + 1) for i,o in enumerate(request_options.options)]
	available_options.append(f'Default is 1 - {request_options.get_title(1)}')
	val = input(get_multiline_input_txt(available_options))
	selectedoptions = SelectedOptions(request_options.get_options(val))

	if selectedoptions.is_custom_request():
		custom_url = input(get_multiline_input_txt([
			'Provide a URL that returns an array of objects. The objects must be 2 key values where one of the values are numeric.'
		]))
		selectedoptions.set_custom_request(custom_url)
	
	return selectedoptions


def get_plot_type() -> PlotType:
	selected_plot = input(get_multiline_input_txt(['Enter 1 to use bar', 'Enter 2 to use line', 'Default is 1 - bar']))
	if selected_plot == '2':
		return 'line'
	else:
		return 'bar'


def get_multiline_input_txt(txt: str):
	return '\n' + '\n'.join(txt) + '\n>> '


def parse_response(raw_data: Dict[str, Coroutine]):
	x_label: str = 'X axis'
	x_val: Union[str, None] = None
	y_val: Union[number, None] = None
	series = set()

	def add(serie: str, x_label: str, val: number):
		if x_label not in data:
			data[x_label] = {}

		data[x_label][serie] = val

	data: Dict[str, Dict[str, str, str, List[number]]] = {}

	for serie in raw_data.keys():
		for data_dict in raw_data[serie]:
			for axis_key in data_dict:
				series.add(serie)

				if isinstance(data_dict[axis_key], numbers.Number):
					y_val = data_dict[axis_key]

				else:
					x_label = axis_key
					x_val = data_dict[axis_key]
				
				if x_val is not None and y_val is not None:
					add(serie, x_val, y_val)
					x_val = None
					y_val = None
					
	padded_data = {
		x_val: {
			serie: data[x_val][serie] if serie in data[x_val] else 0 for serie in series
		} for x_val in data.keys()
	}

	x_vals = [x_val for x_val in data.keys()]
	y_vals = {serie: [padded_data[x_val][serie] for x_val in data.keys()] for serie in series}

	return {
		'x_label': x_label,
		'x_vals': x_vals,
		'y_vals': dict(sorted(y_vals.items()))
	}


async def main():
	selected_options = get_options()

	if selected_options.is_valid():
		plot_type = get_plot_type()

		print('Wait for plot to show...')

		request_objects = selected_options.get_request_objects()
		urls = list(request_objects.keys())

		async with Backend() as backend:
			json_resp = await backend.get_responses(urls)
		
		legend = list(request_objects.values())
		data = parse_response(dict(zip(legend, json_resp)))
		plot_responses(plot_type, selected_options.get_title(), data)

	else:
		print(f'You provided "{selected_options.get_first_url()}" which is not a valid url.')


asyncio.run(main())
