import hippie from "hippie";

import {
  start,
  report,
  logErrors,
  reportErrors,
  preview,
  promiseTimeout,
  suite
} from "run";

export default async function run() {
  suite("Pulling clients should work properly");

  await start("hive")
    .get(`/client`)
    .expectKey("data")
    .expect((res, body, next) => {
      const err = !Array.isArray(body.data) || body.data.length === 0;
      next(err);
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);
  return true;
}
