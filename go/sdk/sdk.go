package sdk

import (
	"encoding/json"
	"net/http"

	"github.com/mabels/runified/types"
	"github.com/mabels/runified/utils"
)

type SdkClientParams struct {
	BaseUrl string
	Client  types.HttpClient
	Sys     types.SysAbstraction
}

func NewSdkClient(params SdkClientParams) types.SDKClient {
	if params.Client == nil {
		params.Client = http.DefaultClient
	}
	if params.Sys == nil {
		params.Sys = utils.SysAbstraction
	}
	if params.BaseUrl == "" {
		panic("Url is required")
	}
	return &client{SdkClientParams: params}
}

