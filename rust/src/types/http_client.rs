
trait HttpClient {
	fn CloseIdleConnections();
	fn Do(req: hyper::Request<Body>) -> Result<hyper::Response<Body>, Error>;
	fn Get(url: string)->  Result<hyper::Response<Body>, Error>;
	fn Head(url: string)->  Result<hyper::Response<Body>, Error>;
	fn Post(url: string, contentType: string, body: std::io::Reader)->  Result<hyper::Response<Body>, Error>;
	// fn PostForm(url: string, data: url.Values)->  (resp *hyper::Response<Body>, err error)
}
