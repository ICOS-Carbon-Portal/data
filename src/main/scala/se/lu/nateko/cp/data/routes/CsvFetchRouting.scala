package se.lu.nateko.cp.data.routes

import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpEntity
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers._
import akka.http.scaladsl.server.Directives._
import akka.stream.scaladsl.Source
import akka.util.ByteString
import se.lu.nateko.cp.data.services.fetch.BinTableCsvReader
import se.lu.nateko.cp.data.services.upload.UploadService
import se.lu.nateko.cp.meta.core.data.Envri.EnvriConfigs

import java.nio.charset.StandardCharsets


class CsvFetchRouting(upload: UploadService)(implicit envriConf: EnvriConfigs) {
	import UploadRouting.requireShaHash
	private val fetcher = new BinTableCsvReader(upload)

	val extractEnvri = UploadRouting.extractEnvriDirective

	val route = (pathPrefix("csv") & get & extractEnvri){implicit envri =>
		requireShaHash{hash =>
			onSuccess(fetcher.csvSource(hash, None, None, None)){src =>
				complete(
					HttpEntity(
						ContentTypes.`text/csv(UTF-8)`,
						src.map(s => ByteString(s))
					)
				)
			}
		}
	}
}
