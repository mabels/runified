package testutils

import (
	"io"
	"net/http"
	"net/url"
)

type HttpClient struct {
	Res http.Response
}

func NewMockHttpClient(ress ...http.Response) *HttpClient {
	res := http.Response{}
	if len(ress) > 0 {
		res = ress[0]
	}
	if res.Header == nil {
		res.Header = http.Header{}
	}
	if res.Body == nil {
		res.Body = http.NoBody
	}

	return &HttpClient{Res: res}
}

func (*HttpClient) CloseIdleConnections() {

}
func (hc *HttpClient) Do(req *http.Request) (*http.Response, error) {
	res := hc.Res
	for k, v := range req.Header {
		for _, vv := range v {
			res.Header.Add(k, vv)
		}
	}
	if res.StatusCode == 0 {
		res.StatusCode = http.StatusOK
	}
	return &res, nil
}
func (*HttpClient) Get(url string) (resp *http.Response, err error) {
	return nil, nil
}
func (*HttpClient) Head(url string) (resp *http.Response, err error) {
	return nil, nil
}
func (*HttpClient) Post(url string, contentType string, body io.Reader) (resp *http.Response, err error) {
	return nil, nil
}
func (*HttpClient) PostForm(url string, data url.Values) (resp *http.Response, err error) {
	return nil, nil
}
