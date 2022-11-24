package se.lu.nateko.cp.data.formats.netcdf

import se.lu.nateko.cp.data.NetCdfConfig
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.NetCdfViewServiceImpl
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl.ViewServiceFactoryImpl
import se.lu.nateko.cp.data.utils.usingWithFuture
import se.lu.nateko.cp.meta.core.data.VarInfo
import ucar.ma2.MAMath
import ucar.ma2.Section
import ucar.nc2.Variable
import ucar.nc2.dataset.NetcdfDatasets

import java.io.File
import java.nio.file.Path
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters.SeqHasAsJava
import scala.util.Using

class NetcdfUtil(config: NetCdfConfig) {
	import config._

	def serviceFactory(folderPath: String) =
		new ViewServiceFactoryImpl(folderPath, dateVars.asJava, latitudeVars.asJava, longitudeVars.asJava, elevationVars.asJava)

	def service(file: Path) =
		new NetCdfViewServiceImpl(file.toAbsolutePath.toString, dateVars.asJava, latitudeVars.asJava, longitudeVars.asJava, elevationVars.asJava)

}

object NetcdfUtil{

	def calcMinMax(file: File, varname: String)(using ExecutionContext): Future[VarInfo] = {
		def ds = NetcdfDatasets.openDataset(file.getAbsolutePath, false, null)

		val sectionsTry = Using(ds){ncd =>
			partition(ncd.findVariable(varname).getShape)
		}
		Future.fromTry(sectionsTry).flatMap{sections =>
			val minMaxFuts = sections.map{section =>
				usingWithFuture(ds){ncd =>
					val v = ncd.findVariable(varname)
					val skipValue = Option(v.findAttribute("_FillValue"))
					Future{
						//println(s"Reading $section (section size = ${section.computeSize}, var size = ${v.getSize})")
						val data = v.read(section)
						//println(s"Have read $section")
						val mm = skipValue.fold(MAMath.getMinMax(data)){ skip =>
							MAMath.getMinMaxSkipMissingData(data, skip.getNumericValue().doubleValue())
						}
						//println(s"Got partial minmax for $section : $mm")
						mm
					}
				}
			}
			Future.sequence(minMaxFuts).map(_.reduce{(mm1, mm2) =>
				val min = Math.min(mm1.min, mm2.min)
				val max = Math.max(mm1.max, mm2.max)
				new MAMath.MinMax(min, max)
			}).map{minMax =>
				//println(s"Got minmax: $minMax")
				VarInfo(varname, minMax.min, minMax.max)
			}
		}
	}

	def partition(shape: Array[Int]): Seq[Section] = {
		val totalN: Long = shape.foldLeft(1L)(_ * _)
		val maxN = 1L << 25
		val sects: Seq[Section] = if(totalN <= maxN) IndexedSeq(new Section(shape)) else {
			val factor: Int = (totalN / maxN).toInt + 1
			val pagingDimensionIdx = shape.indexWhere(_ >= factor)
			val pagDimLen = shape(pagingDimensionIdx)
			val step = pagDimLen / factor
			(0 until pagDimLen).sliding(step, step).map{idxArr =>
				val shapeCopy = Array.copyOf(shape, shape.length)
				shapeCopy(pagingDimensionIdx) = idxArr.length
				val origins = Array.fill(shape.length)(0)
				origins(pagingDimensionIdx) = idxArr(0)
				new Section(origins, shapeCopy)
			}.toIndexedSeq
		}
		@annotation.nowarn val res = sects.map(_.makeImmutable())
		res
	}
}
