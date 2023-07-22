
type HTTPHandlerFn = fn(req: hyper::Request<hyper::Body>, res: hyper::Response<hyper::Body>);


pub trait HTTPHandler {
	// fn Start() -> Option<&(dyn Error + 'static)>;
	// fn Stop() -> Option<&(dyn Error + 'static)>;
	// fn RegisterHandler(path: String, fc: HTTPHandlerFn) -> Result<fn(), Error>;
}