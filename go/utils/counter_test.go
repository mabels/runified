package utils

import (
	"net/http"
	"testing"
)

func TestFilterHeadersFunc(t *testing.T) {

	confidentialHeaderSlice := []string{"Authorization", "Cookie", "X-Request-ID"}

	headers := http.Header{}
	headers.Add("testHeader", "testHeader")
	for _, header := range confidentialHeaderSlice {
		headers.Add(header, "testHeader")
	}

	filteredHeaders := FilterHeaders(headers)

	if len(filteredHeaders) == 0 {
		t.Error("filteredHeaders should not be empty")
	}

	for i := 0; i < len(confidentialHeaderSlice); i++ {
		if filteredHeaders[confidentialHeaderSlice[i]] != nil {
			t.Error("filteredHeaders should not contain confidential headers")
		}
	}

}

func TestCalculateHeaderByteLength(t *testing.T) {

	headers := http.Header{}

	headers.Add("testHeader", "testHeader")
	headers.Add("testHeader", "testHeader2")

	bytes := CalculateHeaderByteLength(headers)

	if bytes != 31 {
		t.Error("bytes should be 31 -- ", bytes)

	}

}
