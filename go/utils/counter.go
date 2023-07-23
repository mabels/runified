package utils

import (
	"io"
	"net/http"
)

type CountingRequestReader struct {
	R         io.ReadCloser
	ReadBytes uint64
}

func (crr *CountingRequestReader) Read(p []byte) (n int, err error) {
	n, err = crr.R.Read(p)
	crr.ReadBytes += uint64(n)
	return
}
func (crr *CountingRequestReader) Close() error {
	return crr.R.Close()
}

type CountingResponseWriter struct {
	W            http.ResponseWriter
	WrittenBytes uint64
}

func (c *CountingResponseWriter) Header() http.Header {
	return c.W.Header()
}
func (c *CountingResponseWriter) Write(b []byte) (int, error) {
	// count
	count, err := c.W.Write(b)
	c.WrittenBytes += uint64(count)
	return count, err
}
func (c *CountingResponseWriter) WriteHeader(statusCode int) {
	c.W.WriteHeader(statusCode)
}

// calculate the bytelength of the headers of type map[string][]string
func CalculateHeaderByteLength(headers http.Header) uint64 {
	var totalSum uint64 = 0
	for k, vs := range headers {
		totalSum += uint64(len(k))
		for _, v := range vs {
			totalSum += uint64(len(v))
		}
	}
	return totalSum
}

// filter out unwanted headers from request headers
func FilterHeaders(headers http.Header) http.Header {
	resultingHeaders := headers
	confidentialHeaderSlice := []string{"Authorization", "Cookie", "X-Request-ID"}
	for _, header := range confidentialHeaderSlice {
		resultingHeaders.Del(header)
	}
	return resultingHeaders
}
