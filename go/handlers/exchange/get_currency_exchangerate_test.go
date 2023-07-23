package handlers_exchange

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/stretchr/testify/assert"
)

func TestGetCurrencyExchangeRate(t *testing.T) {
	currencyReq := types.CurrencyExchangePairRequest{
		BaseCurrency:       "eth",
		ConversionCurrency: "usd",
	}

	currencyReqJson, err := json.Marshal(currencyReq)
	if err != nil {
		t.Error("Error marshalling data:", err)
	}

	r, err := http.NewRequest("POST", "test://test", bytes.NewBuffer(currencyReqJson))
	if err != nil {
		t.Fatal("Error creating request:", err)
	}
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Accept", "application/json")

	hdl := testutils.NewMockApiHandler(&types_app.CLIConfig{}, &testutils.MockApiHandler[types.CurrencyExchangePairRequest, types.CurrencyExchangePair]{
		Req:         r,
		RequestData: &currencyReq,
	})

	GetCurrencyExchangerate(hdl)

	if hdl.Res.StatusCode != 200 {
		t.Error("Status code not set to 200", hdl.Res.StatusCode)
	}

	conversionRes := hdl.ResponseData
	ref, _ := testutils.NewMockExchangePair()

	assert.Equal(t, conversionRes, &ref)

	_, prs := conversionRes.ExchangePair[currencyReq.BaseCurrency]
	assert.Equal(t, prs, true)
	_, prs = conversionRes.ExchangePair[currencyReq.BaseCurrency][currencyReq.ConversionCurrency]
	assert.Equal(t, prs, true)
}
