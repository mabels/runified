package handlers_http

import types_app "github.com/mabels/runified/types/app"

func MapBrowserMethod(api types_app.ApiHandler) bool {
	override := api.Request().Header.Get("X-HTTP-Method-Override")
	if override == "" {
		return true
	}
	api.Request().Method = override
	return true
}
