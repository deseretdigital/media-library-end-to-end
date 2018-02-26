import config from "../../config.dev.json";
import http from "http";
import {
  start,
  report,
  logErrors,
  reportErrors,
  preview,
  promiseTimeout,
  suite
} from "run";

import hippie, { assert } from "hippie";

const { stage, stagevarnish } = config;

function purge(url) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      method: "PURGE",
      hostname: "ddmmedia-varnish03.deseretdigital.com",
      path: "/file/a937415581/hive/apthumbnail/image",
      port: 80
    });

    req.end();

    req.once("response", res => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      resolve();
    });
  });
}

export default async function run() {
  suite("Retrieve from stage");

  let contentLength;
  const test = start("hive");

  // Error - contents, name is required

  await Promise.all(
    [stage].map(async server => {
      await purge("/file/a937415581/hive/apthumbnail/image");
      // Hit Varnish with our error
      await start("hive", stagevarnish)
        .get(`/file/a937415581/hive/apthumbnail/image`)
        .header("x-fail-please", "true")
        .expectStatus(503)
        .parser((body, cb) => {
          cb(null, {});
        })
        // .expectHeader("Content-Type", "application/json")
        // .expectHeader("Age", "0")
        .end()
        .then(res => report(res, `| length: ${res.headers["content-length"]}`))
        .catch(reportErrors);
      await start("hive", stagevarnish)
        .get(`/file/a937415581/hive/apthumbnail/image`)
        .expectStatus(200)
        .parser((body, cb) => {
          cb(null, {});
        })
        .expectHeader("Content-Type", "image/jpeg")
        .end()
        .then(res => report(res, `| length: ${res.headers["content-length"]}`))
        .catch(reportErrors);
      // Hit Varnish with NOT our error
      for (let i = 0; i < 10; i++) {
        await start("hive", stagevarnish)
          .get(`/file/a937415581/hive/apthumbnail/image`)
          .expectStatus(200)
          .parser((body, cb) => {
            cb(null, {});
          })
          .expectHeader("Content-Type", "image/jpeg")
          .end()
          .then(res =>
            report(res, `| ${i} | length: ${res.headers["content-length"]}`)
          )
          .catch(reportErrors);
      }
      // check to make sure our fail header works ("works")
      await start("hive", server)
        .get(`/file/a937415581/hive/apthumbnail/image`)
        .header("x-fail-please", "true")
        .expectStatus(500)
        .parser((body, cb) => {
          cb(null, {});
        })
        .expectHeader("Content-Type", "application/json")
        .end()
        .then(res => report(res, `| length: ${res.headers["content-length"]}`))
        .catch(reportErrors);
      await start("hive", server)
        .get(`/file/a937415581/hive/apthumbnail/image`)
        .expectStatus(200)
        .parser((body, cb) => {
          cb(null, {});
        })
        .expectHeader("Content-Type", "image/jpeg")
        .end()
        .then(res => report(res, `| length: ${res.headers["content-length"]}`))
        .catch(reportErrors);
    })
  );
  return true;
}
