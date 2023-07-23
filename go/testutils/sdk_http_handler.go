package testutils

import (
	"bytes"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
)

type MockSdkHttpHandler struct {
	DirectCall func(w http.ResponseWriter, r *http.Request)
}

func (m *MockSdkHttpHandler) CloseIdleConnections() { panic("todo") }
func (m *MockSdkHttpHandler) Do(req *http.Request) (*http.Response, error) {
	mw := NewMockResponseWriter()
	m.DirectCall(mw, req)
	res := http.Response{
		Status:     "DIRECTCALL",
		StatusCode: mw.StatusCode,
		Proto:      "1.0",
		ProtoMajor: 1,
		ProtoMinor: 0,
		Header:     mw.Header(),
		Body:       ioutil.NopCloser(bytes.NewReader(mw.Body.Bytes())),
	}
	return &res, nil
}
func (m *MockSdkHttpHandler) Get(url string) (resp *http.Response, err error)  { panic("todo") }
func (m *MockSdkHttpHandler) Head(url string) (resp *http.Response, err error) { panic("todo") }
func (m *MockSdkHttpHandler) Post(url string, contentType string, body io.Reader) (resp *http.Response, err error) {
	panic("todo")
}
func (m *MockSdkHttpHandler) PostForm(url string, data url.Values) (resp *http.Response, err error) {
	panic("todo")
}
