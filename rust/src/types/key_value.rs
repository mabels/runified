
trait KeyValueStoreBlob {
	fn Get(key: string) -> Result<Vec<u8>, Error>;
	fn Set(key: string, value: Vec<u8>) -> Option<Error>;
	fn Del(key: string) -> Result<Vec<u8>, Error>;
}

trait KeyValueStore<T> {
	fn Get(key: string) -> Result<T, error>;
	fn Set(key: string, value: T) -> Option<Error>;
	fn Del(key: string) -> Result<T, Error>;
}

// type KeyNotFound struct {
// 	Key string
// }

// func (f KeyNotFound) Error() string {
// 	return fmt.Sprintf("key not found: %s", f.Key)
// }
