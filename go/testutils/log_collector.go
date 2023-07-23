package testutils

import (
	"bufio"
	"bytes"
	"encoding/json"
)

type LogCollector struct {
	buf bytes.Buffer
}

func (l *LogCollector) Write(p []byte) (n int, err error) {
	return l.buf.Write(p)
}

func (l *LogCollector) Logs() []map[string]interface{} {
	scanner := bufio.NewScanner(bufio.NewReader(&l.buf))
	results := []map[string]interface{}{}
	for scanner.Scan() {
		jsonStr := scanner.Text()
		my := map[string]interface{}{}
		err := json.Unmarshal([]byte(jsonStr), &my)
		if err != nil {
			panic(err)
		}
		results = append(results, my)
	}
	return results
}
