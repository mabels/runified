package handlers_http

import (
	"net/http"

	types_app "github.com/mabels/runified/types/app"
)

func HandleOPTIONS(api types_app.ApiHandler) bool {
	r := api.Request()
	if r.Method == "OPTIONS" {
		w := api.Response()
		// Send response to OPTIONS requests
		w.Header().Set("Access-Control-Allow-Methods", "POST,GET")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "3600")
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	return true
}
