
trait API {
	fn App() -> App;
	fn Log() -> Logger;
	fn KeyValueStore(storeName: string) -> Result<KeyValueStoreBlob>;
}

// type ErrKVStoreNotSupported struct {
// 	Key string
// }

// func (f ErrKVStoreNotSupported) Error() string {
// 	return fmt.Sprintf("KVStore type unknown: %s", f.Key)
// }
