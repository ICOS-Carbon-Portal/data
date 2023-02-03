package se.lu.nateko.cp.data.test.api

import se.lu.nateko.cp.data.ConfigReader
import java.nio.file.Path
import se.lu.nateko.cp.data.formats.netcdf.*

object NetcdfPlayground:

	val conf = ConfigReader.getDefault.netcdf
	val servFactory = ViewServiceFactory(Path.of(conf.folder), conf)
	val s = servFactory.getNetCdfViewService("GCP2022_inversions_1x1_version1_1_20230127.nc")

	val ensNameVar = s.withDataset{
		_.findVariable("ensemble_member_name").read()
	}
