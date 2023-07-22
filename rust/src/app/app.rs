
// use crate::types::app::*;

// struct app {
// 	appParam:    AppParam,
// 	httpHandler
// }

// impl app for crate::types::app::App {
// }

// func BindAppToHandler(app types.App, appHandlerfn types.AppHandlerFn) func(w http.ResponseWriter, r *http.Request) {
// 	return func(w http.ResponseWriter, r *http.Request) {
// 		rid := r.Header.Get("X-Request-ID")
// 		if rid == "" {
// 			rid = uuid.New().String()
// 			r.Header.Set("X-Request-ID", rid)
// 			w.Header().Set("X-Request-ID", rid)
// 		}

// 		log := app.Log().With().Str("rid", rid).Str("path", r.URL.Path).Logger()
// 		start := time.Now()

// 		nw := utils.CountingResponseWriter{W: w}
// 		crr := utils.CountingRequestReader{R: r.Body}
// 		r.Body = &crr

// 		ctx := &types.AppHandler{
// 			App_:       app,
// 			Log_:       &log,
// 			RequestId_: rid,
// 			Req:        r,
// 			Res:        &nw,
// 		}

// 		appHandlerfn(ctx)

// 		headers := utils.FilterHeaders(r.Header)
// 		requestLength := utils.CalculateHeaderByteLength(r.Header) + crr.ReadBytes
// 		log.Info().
// 			Any("headers", headers).
// 			Dur("duration", time.Since(start)).
// 			Uint64("requestLength", requestLength).
// 			Uint64("responseLength", nw.WrittenBytes+uint64(utils.CalculateHeaderByteLength(nw.Header()))).
// 			Msg("Request completed")

// 	}
// }

// func NewApp(ap *types.AppParam) types.App {
// 	if ap.Ctx == nil {
// 		ap.Ctx = context.Background()
// 	}
// 	if ap.Sys == nil {
// 		ap.Sys = utils.SysAbstraction
// 	}
// 	a := app{
// 		appParam: *ap,
// 	}
// 	api := api{app: &a}
// 	a.httpHandler = http_handler.NewHTTPHandler(http_handler.HTTPHandlerParam{
// 		Ctx:    a.appParam.Ctx,
// 		Listen: a.appParam.CLIconfig.Listen,
// 	})
// 	a.httpHandler.RegisterHandler("/hi", BindAppToHandler(&a, handlers.HiHandler))
// 	a.httpHandler.RegisterHandler("/", BindAppToHandler(&a, handlers.HelloHandler))
// 	a.httpHandler.RegisterHandler(
// 		"/runified",
// 		WrapApiHandler[RunifiedReq, RunifiedRes](
// 			&api,
// 			[]types.ApiHandlerUnTyped{
// 				handlers.SetCorsHeader,
// 				handlers.HandleOptions,
// 				WrapUntypedApi[RunifiedReq, RunifiedRes](handlers.Runified),
// 			}
// 		),
// 	)

// 	return &a
// }

// func (a *app) Sys() types.SysAbstraction {
// 	return a.appParam.Sys
// }

// func (a *app) KeyValueStore(string) (types.KeyValueStoreBlob, error) {
// 	panic("implement me")
// 	// return nil, nil
// }

// func (a *app) CLIConfig() *types.CLIConfig {
// 	return a.appParam.CLIconfig
// }

// func (a *app) Context() context.Context {
// 	return a.appParam.Ctx
// }

// func (a *app) Log() *zerolog.Logger {
// 	return a.appParam.Log
// }

// func (a *app) Start() error {
// 	a.httpHandler.Start()
// 	return nil
// }

// func (a *app) Stop() error {
// 	a.httpHandler.Stop()
// 	return nil
// }

// func (a *app) HTTPHandler() types.HTTPHandler {
// 	return a.httpHandler
// }
