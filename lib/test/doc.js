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

    /**
    *  POST tests
    *  contents, url, and s3, along with their exceptions
    **/
    let id;
    let downloadUrl;
    const data = {
        contents: Buffer.from(fs.readFileSync(__dirname + '/../img/IMG_1452.jpg')).toString('base64')
    };

    // Error - contents, name is required
    await start('hive')
        .post(`/doc`)
        .send(data)
        .expectKey('error')
        .expect((res, body, next) => {
            if(body.error.length === 0) {
                logErrors('Expected name error');
            }
            next(body.error.length === 0);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);
    // Success contents
    await start('hive')
        .post(`/doc`)
        .send({
            ...data,
            name: 'flowers.jpeg'
        })
        .expect((res, body, next) => {
            next(assertValidMLResponse(body) === false)
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
    await start('utah')
        .post(`/doc`)
        .send({
            ...data,
            name: 'flowers.jpeg'
        })
        .expect((res, body, next) => {
            if(body.error.length === 0) {
                logErrors('Expected permissions error');
            }
            next(body.error.length === 0);
        })
        .expectStatus(401)
        .end()
        .then(report)
        .catch(reportErrors);
    //Error - invalid url
    await start('hive')
        .post(`/doc`)
        .send({
            download_url: 'fake.com'
        })
        .expectKey('error')
        .expect((res, body, next) => {
            if(body.error.length === 0) {
                logErrors('Expected url error');
            }
            next(body.error.length === 0);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);
    //Success url
    await start('hive')
        .post(`/doc`)
        .send({
            download_url: downloadUrl
        })
        .expect((res, body, next) => {
            next(assertValidMLResponse(body) === false)
        })
        .expect((res, body, next) => {
            if(id !== body.data.id) {
                logErrors('Expected ids to be the same');
            }
            next(id !== body.data.id); //ids should be the same - it is the same upload
        })
        .expectStatus(201)
        .end()
        .then(report)
        .catch(reportErrors);
    //Error - unknown method
    await start('hive')
        .post(`/doc`)
        .send({
            foo: 'bar'
        })
        .expect((res, body, next) => {
            if(body.error.length === 0) {
                logErrors('Expected uknown method error');
            }
            next(body.error.length === 0);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);
    //success file upload
    await start('hive', undefined, true)
        .use((options, next) => {
            options.formData = {
                file: fs.createReadStream(__dirname + '/../img/IMG_1452.jpg')
            };
            next(options);
        })
        .post(`/doc`)
        .expect((res, body, next) => {
            next(assertValidMLResponse(body) === false)
        })
        .expect((res, body, next) => {
            if(id !== body.data.id) {
                logErrors('Expected ids to be the same');
            }
            next(id !== body.data.id); //ids should be the same - it is the same upload
        })
        .expectStatus(201)
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
        if(body.error.length === 0) {
            logErrors('Expected invalid id error');
        }
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
        name: 'flowers-are-neat.jpg',
        pools: [ 10, 14 ],
        metadata: {
            caption: [{
                value: 'I want to ride my bicycle',
                _is_canonical: 1
            }, {
                value: 'I don\'t want to ride my bicycle',
                _is_canonical: 0
            }],
            foo: [{
                value: 'bar',
                _is_canonical: 0
            }]
        },
    };
    //Success
    await start('hive')
        .put(`/doc/${id}`)
        .send(dataToPut)
        .expect((res, body, next) => {
            next(assertValidMLResponse(body) === false)
        })
        .expect((res, body, next) => {
            if(id !== body.data.id) {
                logErrors('Expected ids to be the same');
            }
            next(id !== body.data.id); //ids should be the same - it is a put
        })
        .expect((res, body, next) => {
            let err = false;
            if(body.data.name !== 'flowers-are-neat.jpg') {
                logErrors('Name was not updated correctly');
                err = true;
            }
            if(body.data.pools.indexOf(10) === -1 || body.data.pools.indexOf(14) === -1) {
                logErrors('Pools were not updated correctly');
                err = true;
            }
            if(!body.data.metadata.width) {
                logErrors('Existing metadata was overwritten and should not have been');
                err = true;
            }
            if(!body.data.metadata.caption || body.data.metadata.caption.length !== 2) {
                logErrors('Caption did not update correctly');
                err = true;
            }
            if(!body.data.metadata.foo || body.data.metadata.foo.length !== 1) {
                logErrors('Caption did not update correctly');
                err = true;
            }
            next(err);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    const kslDataToPut = {
        name: 'flowers-are-neat.jpg',
        metadata: {
            caption: [{
                value: 'HIVE - I don\'t want to ride my bicycle',
                _is_canonical: 0
            }]
        },
    };
    // put a caption with a differnt key
    await start('ksl')
        .put(`/doc/${id}`)
        .send(kslDataToPut)
        .expect((res, body, next) => {
            next(assertValidMLResponse(body) === false)
        })
        .expect((res, body, next) => {
            if(id !== body.data.id) {
                logErrors('Expected ids to be the same');
            }
            next(id !== body.data.id); //ids should be the same - it is a put
        })
        .expect((res, body, next) => {
            let err = false;
            if(!body.data.metadata.caption || body.data.metadata.caption.length !== 2) {
                logErrors('Caption did not update correctly');
                err = true;
            }
            next(err);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);
    //now we need to make sure we didn't overwrite any captions with 2 gets
    await start("hive")
      .get(`/doc/${id}`)
      .expectKey("data")
      .expect((res, body, next) => {
        next(assertValidMLResponse(body) === false);
      })
      .expect((res, body, next) => {
          let successCount = 0;
          body.data.metadata.caption.forEach(caption => {
              if(!caption._is_canonical) {
                  successCount += (caption.value === 'I don\'t want to ride my bicycle') ? 1 : 0;
              } else {
                  successCount += (caption.value === 'I want to ride my bicycle') ? 1 : 0;
              }
          });
          if(successCount !== 2) {
              logErrors('Caption appears to have been overwritten by client without permissions');
          }
          next(!(successCount === 2));
      })
      .expectStatus(200)
      .end()
      .then(report)
      .catch(reportErrors);
      await start("ksl")
        .get(`/doc/${id}`)
        .expectKey("data")
        .expect((res, body, next) => {
          next(assertValidMLResponse(body) === false);
        })
        .expect((res, body, next) => {
            let successCount = 0;
            body.data.metadata.caption.forEach(caption => {
                if(!caption._is_canonical) {
                    successCount += (caption.value === 'HIVE - I don\'t want to ride my bicycle') ? 1 : 0;
                } else {
                    successCount += (caption.value === 'I want to ride my bicycle') ? 1 : 0;
                }
            });
            if(successCount !== 2) {
                logErrors('Caption appears to have been overwritten by client without permissions');
            }
            next(!(successCount === 2));
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    /**
    *  DELETE TESTS
    *
    **/
    //fail to delete
    await start("utah")
        .del(`/doc/${id}`)
        .expect((res, body, next) => {
            if(body.data !== 0) {
                logErrors('Should have failed to delete');
            }
            next(body.data !== 0);
        })
        .end()
        .then(report)
        .catch(reportErrors);
    //get, not deleted
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
    //success
    await start("hive")
        .del(`/doc/${id}`)
        .expect((res, body, next) => {
            if(body.data !== 1) {
                logErrors('Failed to delete');
            }
            next(body.data !== 1);
        })
        .end()
        .then(report)
        .catch(reportErrors);
    //get deleted
    await start("hive")
      .get(`/doc/${id}`)
      .expectKey("error")
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected missing asset error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(404)
      .end()
      .then(report)
      .catch(reportErrors);

  /**
  * S3 tests
  *
  **/
  //name error
  await start('hive')
      .post(`/doc`)
      .send({
          s3_location: 'doesntmatter'
      })
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected name error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(400)
      .end()
      .then(report)
      .catch(reportErrors);
  //too many pools error
  await start('hive')
      .post(`/doc`)
      .send({
          s3_location: 'doesntmatter',
          name: 'doesntmatter',
          pools: [10, 14]
      })
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected pools error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(400)
      .end()
      .then(report)
      .catch(reportErrors);
  //Not your pool error
  await start('hive')
      .post(`/doc`)
      .send({
          s3_location: 'doesntmatter',
          name: 'doesntmatter',
          pools: [1]
      })
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected pools error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(400)
      .end()
      .then(report)
      .catch(reportErrors);
  //bad s3 file error
  await start('hive')
      .post(`/doc`)
      .send({
          s3_location: 'badbadbad',
          name: 'doesntmatter'
      })
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected bad s3 location error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(500)
      .end()
      .then(report)
      .catch(reportErrors);
  //nonexistent your pool error
  await start('hive')
      .post(`/doc`)
      .send({
          s3_location: 'doesntmatter',
          name: 'img.jpg',
          pools: [-1]
      })
      .expect((res, body, next) => {
          if(body.error.length === 0) {
              logErrors('Expected pools error');
          }
          next(body.error.length === 0)
      })
      .expectStatus(400)
      .end()
      .then(report)
      .catch(reportErrors);
  //success passed pool
  await start('ksl', 'https://media.deseretdigital.com')
      .post(`/doc`)
      .send({
          s3_location: 'slc/2632/263288/26328834.jpg',
          name: 'img.jpg',
          pools: [10]
      })
      .expect((res, body, next) => {
          next(assertValidMLResponse(body, false) === false);
      })
      .expectStatus(201)
      .end()
      .then(report)
      .catch(reportErrors);
  //success default pool
  await start('ksl', 'https://media.deseretdigital.com')
      .post(`/doc`)
      .send({
          s3_location: 'slc/2632/263288/26328834.jpg',
          name: 'img.jpg'
      })
      .expect((res, body, next) => {
          next(assertValidMLResponse(body, false) === false);
      })
      .expectStatus(201)
      .end()
      .then(report)
      .catch(reportErrors);

  return true;
}

function assertValidMLResponse(body, requireFilehash = true) {
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
    (!requireFilehash || body.data.file_hash)
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
