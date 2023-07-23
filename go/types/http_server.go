package types

import (
	"context"
	"net/http"
)

type HttpServer interface {
	SetHandler(h http.Handler)
	ListenAndServe() error
	Shutdown(ctx context.Context) error
}
