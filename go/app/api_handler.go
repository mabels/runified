package app

import (
	"encoding/json"
	"io/ioutil"
	"net/http"

	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type RequestTypeFactory[Q any] func() *Q

// wraps typed apihandler into untyped apihandler
func WrapUntypedApi[Q any, S any](apihandler types_app.ApiHandlerTyped[Q, S]) types_app.ApiHandlerUnTyped {
	return func(api types_app.ApiHandler) bool {
		return apihandler(api.(types_app.APIMsg[Q, S]))
	}
}

func WrapApiHandler[Q any, S any](api types_app.API, handlers []types_app.ApiHandlerUnTyped, rtf RequestTypeFactory[Q]) func(w http.ResponseWriter, r *http.Request) {

	return BindAppToHandler(api.App(), func(reqApp *types_app.AppHandler) {
		r := reqApp.Request()
		w := reqApp.Response()
		log := reqApp.Log().With().Str("api", r.URL.Path).Logger()
		hdl := apiHandler[Q, S]{
			api:                api,
			logRef:             &log,
			requestTypeFactory: rtf,
			requestId:          r.Header.Get("X-Request-ID"),
			httpRequest:        r,
			httpResponse:       w,
		}
		for _, handler := range handlers {
			ret := handler(&hdl)
			if !ret {
				break
			}
		}
	})

}

type apiHandler[Q any, S any] struct {
	api                types_app.API
	logRef             *zerolog.Logger
	requestTypeFactory RequestTypeFactory[Q]
	requestId          string
	httpRequest        *http.Request
	httpResponse       http.ResponseWriter
}

func (api *apiHandler[Q, S]) Log() *zerolog.Logger {
	return api.logRef
}

func (api *apiHandler[Q, S]) Api() types_app.API {
	return api.api
}

func (api *apiHandler[Q, S]) RequestId() string {
	return api.requestId
}

func (api *apiHandler[Q, S]) Request() *http.Request {
	return api.httpRequest
}

func (api *apiHandler[Q, S]) Response() http.ResponseWriter {
	return api.httpResponse
}

func (api *apiHandler[Q, S]) ErrorMsg(err error) {
	api.Log().Error().Err(err).Msg("API error")
	res := api.Response()
	res.WriteHeader(http.StatusInternalServerError)
	errMsg := types.ErrorMsg{
		Status:    http.StatusInternalServerError,
		RequestId: api.RequestId(),
		Message:   err.Error(),
	}
	bytesErrMsg, err := json.Marshal(errMsg)
	if err != nil {
		api.Log().Error().Err(err).Msg("Error marshalling error message")
		return
	}
	res.Write(bytesErrMsg)
}

func (api *apiHandler[Q, S]) WriteMsg(data *S) {
	responseJsonPayload, err := json.Marshal(data)
	w := api.httpResponse
	if err != nil {
		api.ErrorMsg(err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Request-ID", api.requestId)
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(responseJsonPayload)
	if err != nil {
		api.ErrorMsg(err)
		return
	}
}

func (api *apiHandler[Q, S]) RequestMsg() (*Q, error) {
	body, err := ioutil.ReadAll(api.Request().Body)
	if err != nil {
		return nil, err
	}
	reqData := api.requestTypeFactory()
	err = json.Unmarshal(body, reqData)
	if err != nil {
		return nil, err
	}
	return reqData, nil
}
