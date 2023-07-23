package handlers_http

import types_app "github.com/mabels/runified/types/app"

func AllowMethods(methods ...string) types_app.ApiHandlerUnTyped {
	return func(api types_app.ApiHandler) bool {
		if len(methods) == 0 {
			return true
		}
		r := api.Request()
		for _, method := range methods {
			if r.Method == method {
				return true
			}
		}
		w := api.Response()
		w.WriteHeader(405)
		return false
	}
}
