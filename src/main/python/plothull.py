#!/usr/bin/env python
import matplotlib.pyplot as plt
import numpy as np

skip = 0#55590
#take = 10

def load_track(file_name, skip):
	return np.loadtxt(file_name, delimiter = ',', skiprows = (skip + 1))

file_base = '/home/oleg/Downloads/58GS20040825_CO2_underway_SOCATv3'
#file_base = '/home/oleg/Downloads/06AQ20120411_CO2_underway_SOCATv3'

orig = load_track(file_base + '.csv', skip)
reduced = load_track(file_base + '.reduced.csv', 0)

x6 = [126.78083483632014, -100.94871632118435, -165.18184457976855, -100.94871632118426, 126.78083483632004, 175.8871963966767]
y6 = [-89.7927492841762, -73.54171609855528, -39.87243453740618, -73.54171609855533, -89.79274928417618, -60.46169828056818]
x5 = [126.78083483632014, -100.94871632118435, -165.18184457976855, -100.94871632118426, 126.78083483632004]
y5 = [-89.7927492841762, -73.54171609855528, -39.87243453740618, -73.54171609855533, -89.79274928417618]
x4 = [-100.94871632118435, -165.18184457976855, -100.94871632118426, 126.78083483632004]
y4 = [-73.54171609855528, -39.87243453740618, -73.54171609855533, -89.79274928417618]


plt.plot(reduced[:,1], reduced[:,0], 'ro-', markersize=5, linewidth=4)
plt.plot(orig[:,1], orig[:,0], 'bo', markersize=1)
#plt.plot(x6, y6, 'ro-', markersize=5, linewidth=4)
#plt.plot(orig[0:take,1], orig[0:take,0], 'bo-', markersize=3)

plt.show()
