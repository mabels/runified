package types_app

import (
	"net/http"

	"github.com/rs/zerolog"
)

type AppHandlerFn func(app *AppHandler)

type AppHandler struct {
	App_       App
	Log_       *zerolog.Logger
	RequestId_ string
	Req        *http.Request
	Res        http.ResponseWriter
}

func (ctx *AppHandler) App() App {
	return ctx.App_
}
func (ctx *AppHandler) Log() *zerolog.Logger {
	return ctx.Log_
}
func (ctx *AppHandler) RequestId() string {
	return ctx.RequestId_
}
func (ctx *AppHandler) Response() http.ResponseWriter {
	return ctx.Res
}
func (ctx *AppHandler) Request() *http.Request {
	return ctx.Req
}
