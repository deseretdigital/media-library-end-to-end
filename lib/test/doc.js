import fs from "fs";

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
  suite("Pulling, uploading, updating, and deleting media");

  //TODO we should test s3_location
  //TODO I don't think we can post a file the "form" way - so we can't test that
  //TODO test that when another client puts we don't overwrite their client data
  //TODO delete

  /**
   *  POST tests
   *  contents, url, and s3, along with their exceptions
   **/
  let id;
  let downloadUrl;
  const test = start("hive");
  const data = {
    contents: Buffer.from(
      fs.readFileSync(__dirname + "/../img/reef.jpeg")
    ).toString("base64")
  };

  // Error - contents, name is required
  await start("hive")
    .post(`/doc`)
    .send(data)
    .expectKey("error")
    .expect((res, body, next) => {
      next(body.error.length === 0);
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);
  // Success contents
  await start("hive")
    .post(`/doc`)
    .send({
      ...data,
      name: "reef.jpeg"
    })
    .expect((res, body, next) => {
      next(assertValidMLResponse(body) === false);
    })
    .expect((res, body, next) => {
      id = body.data.id;
      downloadUrl = body.data.url;
      next(false);
    })
    .expectStatus(201)
    .end()
    .then(report)
    .catch(reportErrors);
  // Permissions error, already uploaded
  await start("utah")
    .post(`/doc`)
    .send({
      ...data,
      name: "reef.jpeg"
    })
    .expect((res, body, next) => {
      next(body.error.length === 0);
    })
    .expectStatus(401)
    .end()
    .then(report)
    .catch(reportErrors);
  //Error - invalid url
  await start("hive")
    .post(`/doc`)
    .send({
      download_url: "fake.com"
    })
    .expectKey("error")
    .expect((res, body, next) => {
      next(body.error.length === 0);
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);
  //Success url
  await start("hive")
    .post(`/doc`)
    .send({
      download_url: downloadUrl
    })
    .expect((res, body, next) => {
      next(assertValidMLResponse(body) === false);
    })
    .expect((res, body, next) => {
      next(id !== body.data.id); //ids should be the same - it is the same upload
    })
    .expectStatus(201)
    .end()
    .then(report)
    .catch(reportErrors);
  //Error - unknown method
  await start("hive")
    .post(`/doc`)
    .send({
      foo: "bar"
    })
    .expect((res, body, next) => {
      next(body.error.length === 0);
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * GET tests
   *
   **/
  //Error - invalid id
  await start("hive")
    .get(`/doc/fakeid`)
    .expectKey("data")
    .expect((res, body, next) => {
      next(body.error.length === 0);
    })
    .expectStatus(404)
    .end()
    .then(report)
    .catch(reportErrors);
  //Success
  await start("hive")
    .get(`/doc/${id}`)
    .expectKey("data")
    .expect((res, body, next) => {
      next(assertValidMLResponse(body) === false);
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * PUT tests
   *
   **/
  const dataToPut = {
    name: "coral-reefs-are-neat.jpg",
    pools: [10, 14],
    metadata: {
      caption: [
        {
          value: "I want to ride my bicycle",
          _is_canonical: 1
        },
        {
          value: "I don't want to ride my bicycle",
          _is_canonical: 0
        }
      ],
      foo: [
        {
          value: "bar",
          _is_canonical: 0
        }
      ]
    }
  };
  //Success
  await start("hive")
    .put(`/doc/${id}`)
    .send(dataToPut)
    .expect((res, body, next) => {
      next(assertValidMLResponse(body) === false);
    })
    .expect((res, body, next) => {
      next(id !== body.data.id); //ids should be the same - it is a put
    })
    .expect((res, body, next) => {
      let err = false;
      if (body.data.name !== "coral-reefs-are-neat.jpg") {
        logErrors("Name was not updated correctly");
        err = true;
      }
      if (
        body.data.pools.indexOf(10) === -1 ||
        body.data.pools.indexOf(14) === -1
      ) {
        logErrors("Pools were not updated correctly");
        err = true;
      }
      if (!body.data.metadata.width) {
        logErrors("Existing metadata was overwritten and should not have been");
        err = true;
      }
      if (
        !body.data.metadata.caption ||
        body.data.metadata.caption.length !== 2
      ) {
        logErrors("Caption did not update correctly");
        err = true;
      }
      if (!body.data.metadata.foo || body.data.metadata.foo.length !== 1) {
        logErrors("Caption did not update correctly");
        err = true;
      }
      next(err);
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  return true;
}

function assertValidMLResponse(body) {
  const assertion = !!(
    body.error === null &&
    body.data &&
    body.data.id &&
    body.data.id_hash &&
    body.data.name &&
    body.data.type &&
    body.data.size &&
    body.data.date_created &&
    body.data.pools &&
    Array.isArray(body.data.pools) &&
    body.data.metadata &&
    typeof body.data.metadata === "object" &&
    body.data.url &&
    body.data.pretty_name &&
    body.data.file_hash
  );
  if (!assertion) {
    logErrors(
      "Response not formatted correctly. The following fields are required: \n\
            error(null), data(object), data.id, data.id_hash, data.name, data.type, data.size, data.date_created, data.pools(array), \n\
            data.metadata(object), data.url, data.pretty_name, data.file_hash"
    );
    console.log(body);
  }
  return assertion;
}
