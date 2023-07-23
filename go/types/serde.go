package types

import "encoding/json"

type SerDe interface {
	Marshal(t interface{}) ([]byte, error)
	Unmarshal([]byte, interface{}) error
}

type JsonSerDe struct {
}

func (serde *JsonSerDe) Marshal(t interface{}) ([]byte, error) {
	return json.Marshal(t)
}

func (serde *JsonSerDe) Unmarshal(bytes []byte, t interface{}) error {
	return json.Unmarshal(bytes, t)
}
