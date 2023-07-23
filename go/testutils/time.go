package testutils

import (
	"time"
)

type MockConstTime struct {
}

func (t *MockConstTime) Now() time.Time {
	return time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC)
}

type MockStepTime struct {
	step time.Time
}

func (t *MockStepTime) Now() time.Time {
	if t.step.IsZero() {
		t.step = (&MockConstTime{}).Now()
		return t.step
	}
	t.step = t.step.Add(time.Second)
	return t.step
}
