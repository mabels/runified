package handlers_http

import types_app "github.com/mabels/runified/types/app"

func SetCorsHeader(api types_app.ApiHandler) bool {
	api.Response().Header().Set("Access-Control-Allow-Origin", "*")
	return true
}
