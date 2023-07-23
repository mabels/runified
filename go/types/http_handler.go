package types

import "net/http"

type HTTPHandler interface {
	Start() error
	Stop() error
	RegisterHandler(path string, fn http.HandlerFunc) (func(), error)
}