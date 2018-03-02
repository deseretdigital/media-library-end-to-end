import config from "../../config.dev.json";

import {
  start,
  report,
  logErrors,
  reportErrors,
  preview,
  promiseTimeout,
  suite
} from "run";

import { assert } from "hippie";

const { varnish } = config;

export default async function run() {
  suite("Retrieving from our three Varnish servers");

  let contentLength;
  const test = start("hive");

  // Error - contents, name is required

  await Promise.all(
    varnish.map(async server => {
      await start("hive", server)
        .get(`/file/f6655d7361/hive/apthumbnail/image`)
        .expectStatus(200)
        .parser((body, cb) => {
          cb(null, {});
        })
        .expect((res, body, next) => {
          if (contentLength) {
            next(
              assert(
                res.headers["content-length"],
                contentLength,
                "Content length"
              )
            );
          } else {
            next();
          }
        })
        .expectHeader("Content-Type", "image/jpeg")
        .expect((res, body, next) => {
          next(assert(typeof res.headers.age, "string"));
        })
        .end()
        .then(res => {
          contentLength = res.headers["content-length"];
          return res;
        })
        .then(res => report(res, `| length: ${res.headers["content-length"]}`))
        .catch(reportErrors);
    })
  );
  return true;
}
