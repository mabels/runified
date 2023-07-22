
type AppHandlerFn = fn(app: AppHandler);

struct AppHandler {
    App: App,
    Log: Logger,
    RequestId: string,
    Req: hyper::Request<Body>,
    Res: hyper::Response<Body>,
}
