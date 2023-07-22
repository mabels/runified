
trait HttpServer {
	fn SetHandler(h: HTTPHandler);
	fn ListenAndServe() -> Option<Error>;
	fn Shutdown(/*ctx context.Context*/) -> Option<Error>;
}
