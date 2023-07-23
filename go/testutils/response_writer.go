package testutils

import (
	"bytes"
	"net/http"
)

type MockResponseWriter struct {
	StatusCode int
	HeaderRef  http.Header
	Body       *bytes.Buffer
}

func NewMockResponseWriter() *MockResponseWriter {
	return &MockResponseWriter{
		HeaderRef: http.Header{},
		Body:      bytes.NewBuffer([]byte{}),
	}
}

func (w *MockResponseWriter) Header() http.Header {
	return w.HeaderRef
}

func (w *MockResponseWriter) Write(data []byte) (int, error) {
	return w.Body.Write(data)
}

func (w *MockResponseWriter) WriteHeader(statusCode int) {
	w.StatusCode = statusCode
}
