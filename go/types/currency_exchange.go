package types

type CurrencyExchangePairRequest struct {
	BaseCurrency       string `json:"firstCurrency"`
	ConversionCurrency string `json:"secondCurrency"`
}

type CurrencyExchangePair struct {
	ExchangePair map[string]map[string]float64 `json:"exchangeRatePair"`
}
