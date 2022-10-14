//> using scala "3"
//> using lib "com.lihaoyi::os-lib:0.8.1"

val archExample = os.home / "Documents" / "CP" / "images" / "CD-Ygb_EC_202201010030_L01_F01_img.zip"
val times = for(
	hours <- (0 until 24).map(h => f"$h%02d");
	mins <- Seq("00", "30")
) yield hours + mins
val dateTimes = times.tail.map(t => s"01$t") :+ s"02${times.head}"
val fileNames = dateTimes.map{dt => s"CD-Ygb_EC_202201${dt}_L01_F01_img.zip"}
fileNames.take(2).foreach(upload(archExample, _))


def upload(file: os.Path, asFilename: String): Unit =
	val md5 = os.proc("md5sum", file).call().out.string(scala.io.Codec.UTF8).take(32)
	val url = s"https://CD-Ygb:JQbqia6E0Fc5@datalocal.icos-cp.eu/upload/etc/$md5/$asFilename"
	val curl = os.proc("curl", "-k", "--upload-file", file, url)
	curl.call()