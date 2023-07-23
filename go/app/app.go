package app

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	handlers_http "github.com/mabels/runified/handlers/http"
	transport_http_handler "github.com/mabels/runified/transport/http_handler"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/mabels/runified/utils"
	"github.com/rs/zerolog"
)

type app struct {
	appParam    types_app.AppParam
	httpHandler types.HTTPHandler
}

func BindAppToHandler(app types_app.App, appHandlerfn types_app.AppHandlerFn) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		rid := r.Header.Get("X-Request-ID")
		if rid == "" {
			rid = uuid.New().String()
			r.Header.Set("X-Request-ID", rid)
			w.Header().Set("X-Request-ID", rid)
		}

		log := app.Log().With().Str("rid", rid).Str("path", r.URL.Path).Logger()
		start := time.Now()

		nw := utils.CountingResponseWriter{W: w}
		crr := utils.CountingRequestReader{R: r.Body}
		r.Body = &crr

		ctx := &types_app.AppHandler{
			App_:       app,
			Log_:       &log,
			RequestId_: rid,
			Req:        r,
			Res:        &nw,
		}

		appHandlerfn(ctx)

		headers := utils.FilterHeaders(r.Header)
		requestLength := utils.CalculateHeaderByteLength(r.Header) + crr.ReadBytes
		log.Info().
			Any("headers", headers).
			Dur("duration", time.Since(start)).
			Uint64("requestLength", requestLength).
			Uint64("responseLength", nw.WrittenBytes+uint64(utils.CalculateHeaderByteLength(nw.Header()))).
			Msg("Request completed")

	}
}

func ApiHandler[Q any, S any](hdl types_app.ApiHandlerTyped[Q, S]) []types_app.ApiHandlerUnTyped {
	return []types_app.ApiHandlerUnTyped{
		handlers_http.HandleOPTIONS,
		handlers_http.MapBrowserMethod,
		handlers_http.AllowMethods("POST", "PUT"),
		handlers_http.SetCorsHeader,
		WrapUntypedApi[Q, S](hdl),
	}
}

func NewApp(ap *types_app.AppParam, hfacs ...func(app types_app.App) types.HTTPHandler) types_app.App {
	if ap.Ctx == nil {
		ap.Ctx = context.Background()
	}
	if ap.Sys == nil {
		ap.Sys = utils.SysAbstraction
	}
	a := app{
		appParam: *ap,
	}
	var hfac types.HTTPHandler
	if len(hfacs) > 0 {
		hfac = hfacs[0](&a)
	} else {
		hfac = transport_http_handler.NewHTTPHandler(transport_http_handler.HTTPHandlerParam{
			Ctx:    a.Context(),
			Listen: a.CLIConfig().Listen,
		})
	}
	a.httpHandler = hfac
	api := api{app: &a}

	a.httpHandler.RegisterHandler(
		"/runified",
		WrapApiHandler[RunifiedReq, RunifiedRes](
			&api,
			ApiHandler(handlers.Runified)
		),
	)

	return &a
}

func (a *app) Sys() types.SysAbstraction {
	return a.appParam.Sys
}

func (a *app) KeyValueStore(string) (types.KeyValueStoreBlob, error) {
	panic("implement me")
	// return nil, nil
}

func (a *app) CLIConfig() *types_app.CLIConfig {
	return a.appParam.CLIconfig
}

func (a *app) Context() context.Context {
	return a.appParam.Ctx
}

func (a *app) Log() *zerolog.Logger {
	return a.appParam.Log
}

func (a *app) Start() error {
	a.httpHandler.Start()
	return nil
}

func (a *app) Stop() error {
	a.httpHandler.Stop()
	return nil
}

func (a *app) HTTPHandler() types.HTTPHandler {
	return a.httpHandler
}
