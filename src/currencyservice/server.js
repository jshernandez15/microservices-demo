/*
 * Copyright 2018 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

if(process.env.DISABLE_PROFILER) {
  console.log("Profiler disabled.")
}
else {
  console.log("Profiler enabled.")
  require('@google-cloud/profiler').start({
    serviceContext: {
      service: 'currencyservice',
      version: '1.0.0'
    }
  });
}


if(process.env.DISABLE_TRACING) {
  console.log("Tracing disabled.")
}
else {
  console.log("Tracing enabled.")
  require('@google-cloud/trace-agent').start();
}

if(process.env.DISABLE_DEBUGGER) {
  console.log("Debugger disabled.")
}
else {
  console.log("Debugger enabled.")
  require('@google-cloud/debug-agent').start({
    serviceContext: {
      service: 'currencyservice',
      version: 'VERSION'
    }
  });
}

const path = require('path');
const grpc = require('grpc');
const pino = require('pino');
const protoLoader = require('@grpc/proto-loader');
const { serverInterceptorsFactory } = require("grpc-prometheus");
const { GrpcHostBuilder } = require("grpc-host-builder");
const { ServerCredentials } = require('@grpc/grpc-js');

const MAIN_PROTO_PATH = path.join(__dirname, './proto/demo.proto');
const HEALTH_PROTO_PATH = path.join(__dirname, './proto/grpc/health/v1/health.proto');

const PORT = process.env.PORT;

const shopProto = _loadProto(MAIN_PROTO_PATH).hipstershop;
const healthProto = _loadProto(HEALTH_PROTO_PATH).grpc.health.v1;

const logger = pino({
  name: 'currencyservice-server',
  messageKey: 'message',
  changeLevelName: 'severity',
  useLevelLabels: true
});

/**
 * Helper function that loads a protobuf file.
 */
function _loadProto (path) {
  const packageDefinition = protoLoader.loadSync(
    path,
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }
  );
  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Helper function that gets currency data from a stored JSON file
 * Uses public data from European Central Bank
 */
function _getCurrencyData (callback) {
  const data = require('./data/currency_conversion.json');
  callback(data);
}

/**
 * Helper function that handles decimal/fractional carrying
 */
function _carry (amount) {
  const fractionSize = Math.pow(10, 9);
  amount.nanos += (amount.units % 1) * fractionSize;
  amount.units = Math.floor(amount.units) + Math.floor(amount.nanos / fractionSize);
  amount.nanos = amount.nanos % fractionSize;
  return amount;
}

/**
 * Lists the supported currencies
 */
 const getSupportedCurrencies = function (call) {
  logger.info('Getting supported currencies...');
  var content = {};
  _getCurrencyData((data) => {
    content = {currency_codes: Object.keys(data)};
  });

  return content;
}

/**
 * Converts between currencies
 */
function convert (call) {
  logger.info('received conversion request');
  var resultConvert = {};
  try {
    _getCurrencyData((data) => {
      const request = call.request;

      // Convert: from_currency --> EUR
      const from = request.from;
      const euros = _carry({
        units: from.units / data[from.currency_code],
        nanos: from.nanos / data[from.currency_code]
      });

      euros.nanos = Math.round(euros.nanos);

      // Convert: EUR --> to_currency
      const result = _carry({
        units: euros.units * data[request.to_code],
        nanos: euros.nanos * data[request.to_code]
      });

      result.units = Math.floor(result.units);
      result.nanos = Math.floor(result.nanos);
      result.currency_code = request.to_code;

      logger.info(`conversion request successful`);
      resultConvert = result;
    });
  } catch (err) {
    logger.error(`conversion request failed: ${err}`);
    resultConvert = {error: err.message};
  }
  return resultConvert;
}

/**
 * Endpoint for health checks
 */
const check = function (call) {
  return { status: 'SERVING' };
}

/**
 * Starts an RPC server that receives requests for the
 * CurrencyConverter service at the sample server port
 */
function main () {
  logger.info(`Starting gRPC server on port ${PORT}...`); 

  const server = new GrpcHostBuilder()
    .addInterceptor(
      serverInterceptorsFactory({
        timeBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 10]
      })
    )
    .addService(shopProto.CurrencyService.service, {getSupportedCurrencies, convert})
    .addService(healthProto.Health.service, { check })
    .bind(`0.0.0.0:${PORT}`, ServerCredentials.createInsecure())
    .buildAsync();

}

main();
