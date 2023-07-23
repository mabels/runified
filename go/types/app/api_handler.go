package types_app

import "github.com/rs/zerolog"

type ApiHandler interface {
	CtxHandler
	Log() *zerolog.Logger
	Api() API

	ErrorMsg(err error)
}

type APIMsg[REQ any, RES any] interface {
	ApiHandler
	WriteMsg(data *RES)
	RequestMsg() (*REQ, error)
}

type ApiHandlerTyped[REQ any, RES any] func(api APIMsg[REQ, RES]) bool

type ApiHandlerUnTyped func(api ApiHandler) bool
