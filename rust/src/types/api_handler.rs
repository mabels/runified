use hyper::{Request, Response};

trait ApiHandler {
	fn Log(&self) -> Logger;
	fn RequestId() -> string;
	fn Request() -> Request<Body>;
	fn Response()  -> Response<Body>;

	fn Api() -> API;

	// fn ErrorMsg(err error)
}

trait ApiMsg<REQ, RES> : ApiHandler  {
	fn WriteMsg(self, msg: RES);
	fn RequestMsg(self) -> Result<REQ>;
}

type ApiHandlerTyped<REQ, RES> = fn(api: ApiMsg<REQ, RES>) -> boolean;

type ApiHandlerUnTyped =  fn(api: ApiHandler) -> boolean;

