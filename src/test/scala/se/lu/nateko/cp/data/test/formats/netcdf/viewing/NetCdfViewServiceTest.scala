package se.lu.nateko.cp.data.test.formats.netcdf.viewing

import org.scalatest.FunSuite
import scala.collection.JavaConverters._
import se.lu.nateko.cp.data.formats.netcdf.viewing._
import se.lu.nateko.cp.data.formats.netcdf.viewing.impl._

class NetCdfViewServiceTest extends FunSuite {
  
  def time[T](str: String)(thunk: => T): T = {
    print(str + ": ")
    val t1 = System.currentTimeMillis
    val x = thunk
    val t2 = System.currentTimeMillis
    println((t2 - t1) + " ms")
    x
  }
  
//  test("Get raster from one year from NetCdf file (unlimited date)"){
//    
//    val service = time("NetCdfViewServiceImpl") {
//      val dims = new DimensionsSpecification("date", "latitude", "longitude")
//      val file = new File("/disk/ICOS/carbontracker/yearly_1x1_fluxes.nc")
//      val spec = new ServiceSpecification(file, "ocn_flux_prior", dims)
//      
//      new NetCdfViewServiceImpl(spec)
//    }
//    
//    time("getAvailableDates") {
//      val availableDates = service.getAvailableDates
//    }
//    
//    time("getRaster") {
//      val raster = service.getRaster("2004-07-01T13:40:8.809789")
//    }
//  }
//  
//  test("Get raster from one year from NetCdf file (limited date)"){
//    
//    val service = time("NetCdfViewServiceImpl") {
//      val dims = new DimensionsSpecification("date", "latitude", "longitude")
//      val file = new File("/disk/ICOS/carbontracker/yearly_1x1_fluxes.nc")
//      val spec = new ServiceSpecification(file, "ocn_flux_prior", dims)
//      
//      new NetCdfViewServiceImpl(spec)
//    }
//    
//    time("getAvailableDates") {
//      val availableDates = service.getAvailableDates
//    }
//    
//    time("getRaster") {
//      val raster = service.getRaster("2004-07-01T13:40:8.809789")
//    }
//  }
  
}