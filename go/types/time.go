package types

import "time"

type Time interface {
	Now() time.Time
}
