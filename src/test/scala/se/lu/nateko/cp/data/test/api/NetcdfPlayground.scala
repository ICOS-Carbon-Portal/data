package se.lu.nateko.cp.data.test.api

import se.lu.nateko.cp.data.ConfigReader
import java.nio.file.Path
import se.lu.nateko.cp.data.formats.netcdf.*

object NetcdfPlayground:

	val conf = ConfigReader.getDefault.netcdf
	val servFactory = ViewServiceFactory(Path.of(conf.folder), conf)
	val gcp = servFactory.getNetCdfViewService("GCP2022_inversions_1x1_version1_1_20230127.nc")
	val mu = servFactory.getNetCdfViewService("mu1.0_090_mix_2010_fg.nc")

	val ensNameArr = gcp.withDataset{
		_.findVariable("ensemble_member_name").read()
	}

	val heightArr = mu.withDataset{
		_.findVariable("height").read()
	}
