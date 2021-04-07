module github.com/GoogleCloudPlatform/microservices-demo/src/frontend

go 1.15

require (
	cloud.google.com/go v0.40.0
	contrib.go.opencensus.io/exporter/jaeger v0.2.0
	contrib.go.opencensus.io/exporter/stackdriver v0.5.0
	github.com/golang/protobuf v1.4.3
	github.com/google/pprof v0.0.0-20190515194954-54271f7e092f // indirect
	github.com/google/uuid v1.1.1
	github.com/gorilla/mux v1.7.3
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.10.0 // indirect
	github.com/prometheus/tsdb v0.7.1 // indirect
	github.com/sirupsen/logrus v1.6.0
	github.com/uber/jaeger-client-go v2.21.1+incompatible // indirect
	go.opencensus.io v0.22.2
	golang.org/x/net v0.0.0-20200625001655-4c5254603344
	google.golang.org/api v0.7.1-0.20190709010654-aae1d1b89c27 // indirect
	google.golang.org/appengine v1.6.1 // indirect
	google.golang.org/grpc v1.26.0
)
