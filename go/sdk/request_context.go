package sdk

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"

	"github.com/google/uuid"
	"github.com/mabels/runified/types"
	"github.com/mabels/runified/utils"
)

type client struct {
	SdkClientParams
	// baseURL string
	// client  types.HttpClient
}

type ctxFunction[T any] func(*types.RequestContext, []byte) (*T, error)

func postWithRequestContext[RES any](c *client, url string, reqData interface{}, fn ctxFunction[RES]) (*RES, *types.RequestContext) {
	start := c.Sys.Time().Now()
	rctx := &types.RequestContext{}
	rctx.Stats.Request.Start = start

	body := c.post(rctx, url, reqData)
	if rctx.Error != nil {
		return nil, rctx
	}
	res, err := fn(rctx, body)
	if err != nil {
		rctx.Error = err
		return nil, rctx
	}

	rctx.Stats.Response.End = c.Sys.Time().Now()
	rctx.Duration = rctx.Stats.Response.End.Sub(start)
	return res, rctx
}

func (c *client) post(rctx *types.RequestContext, path string, requestData interface{}) []byte {
	rctx.RequestId = uuid.New().String()
	var reqJson []byte
	reqJson, rctx.Error = json.Marshal(requestData)
	if rctx.Error != nil {
		return nil
	}
	reqUrl, _ := url.JoinPath(c.BaseUrl, path)
	var postReq *http.Request
	postReq, rctx.Error = http.NewRequest("POST", reqUrl, bytes.NewBuffer(reqJson))
	if rctx.Error != nil {
		return nil
	}
	postReq.Header.Set("Content-Type", "application/json")
	postReq.Header.Set("Accept", "application/json")
	postReq.Header.Set("X-Request-ID", rctx.RequestId)

	rctx.Stats.Request.Length = uint64(len(reqJson)) + uint64(utils.CalculateHeaderByteLength(postReq.Header))
	rctx.Stats.Request.Bytes = reqJson
	rctx.Stats.Request.End = c.Sys.Time().Now()
	rctx.Request = postReq
	rctx.Stats.Response.Start = rctx.Stats.Request.End
	var res *http.Response
	res, rctx.Error = c.Client.Do(postReq)
	defer func() {
		if res != nil && res.Body != nil {
			res.Body.Close()
		}
	}()
	if rctx.Error != nil {
		return nil
	}
	rctx.Response = res

	if res.StatusCode != 200 {
		rctx.Error = types.ErrSdkHttpRequestFailed{Request: *postReq, Response: *res}
		return nil
	}
	var body []byte
	body, rctx.Error = ioutil.ReadAll(res.Body)

	if rctx.Error != nil {
		return nil
	}

	rctx.Stats.Response.Length = uint64(len(body)) + utils.CalculateHeaderByteLength(res.Header)
	rctx.Stats.Response.Bytes = body

	return body
}
