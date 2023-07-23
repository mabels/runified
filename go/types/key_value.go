package types

import "fmt"

type KeyValueStoreBlob interface {
	Get(key string) ([]byte, error)
	Set(key string, value []byte) error
	Del(key string) ([]byte, error)
}

type KeyValueStoreInterface interface {
	Get(key string) (interface{}, error)
	Set(key string, value interface{}) error
	Del(key string) (interface{}, error)
}

type KeyValueStore[T any] interface {
	Get(key string) (*T, error)
	Set(key string, value *T) error
	Del(key string) (*T, error)
}

type KeyNotFound struct {
	Key string
}

func (f KeyNotFound) Error() string {
	return fmt.Sprintf("key not found: %s", f.Key)
}
