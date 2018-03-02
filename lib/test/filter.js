import hippie from "hippie";
import get from "lodash/get";
import assignIn from "lodash/assignIn";
import find from "lodash/find";
import first from "lodash/first";

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
  suite("Posting, putting, and getting filters");

  let hiveFilterId = null;
  let hiveFilterName = null;
  let utahFilterId = null;
  let utahFilterName = null;
  let dcFilterId = null;
  let dcFilterName = null;
  let offsetIndexFilterId = null;
  const offsetIndex = 3;
  const searchLimit = 5;

  // id, client_id, name, params, auto_generate_on_upload, auto_generate_on_demand, ttl_days

  // ---------POST Tests---------
  /*  Test bad request (missing name)
    *   Expectation: Should receive a 'missing name' error.
    */
  await start("hive")
    .post(`/filter`)
    .send({
      client_id: 14
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!get(body, "error", false)) {
        logErrors(
          "POST: Expected a 'missing name' error, but no error returned."
        );
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test bad POST request (missing params)
    *   Expectation: Should receive a 'missing params' error.
    */
  await start("hive")
    .post(`/filter`)
    .send({
      client_id: 14,
      name: "E2E Invalid filter"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!get(body, "error", false)) {
        logErrors(
          "POST: Expected a 'missing params' error, but no error returned."
        );
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test bad POST request (invalid params string)
        *   Expectation: Should receive an 'invalid param' error
        */
  // await start("hive")
  //     .post(`/filter`)
  //     .send({
  //         client_id: 14,
  //         name: 'E2E Invalid filter',
  //         params: 'gooblygawk=moregooblygawk'
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         if(!get(body, 'error', false)) {
  //             logErrors("POST: Expected an 'invalid param' error.");
  //         } else {
  //             next();
  //         }
  //     })
  //     .expectStatus(400)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /*  Test bad POST request (Posting with id)
        *   Expectation: Should receive a 'cannot post with ID' error
        */
  await start("utah")
    .post(`/filter`)
    .send({
      id: 15,
      client_id: 1,
      name: "E2E Hive filter",
      params: "resize=width_300-height_300"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!get(body, "error", false)) {
        logErrors(
          "POST: Expected a 'cannot post with ID' error, but no error returned."
        );
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test POST permission error (not own client_id)
        *   Expectation: Should receive a permission error when attempting to insert a filter for a client_id that is not yours.
        */
  /*  This test fails on v1. Even though we are setting client_id here to 14, v1 was changing
            it to client_id 6 and successfully inserting a row in filters. We should not be inserting a record.
            Also, when writing v2 we need to ensure that we are only allowing clients to set filter data for clients
            they have privileges for.
        */
  // await start("dc")
  //     .post(`/filter`)
  //     .send({
  //         client_id: 15,
  //         name: 'E2E Hive filter',
  //         params: 'resize=width_300-height_300'
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         console.log(body);
  //         if(!get(body, 'error', false)) {
  //             logErrors("POST: Expected a permision error, but no error returned.");
  //             next(true);
  //         } else {
  //             next();
  //         }
  //     })
  //     .expectStatus(400)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /*  Test POST permission error (no application permission for client_id)
        *   Expectation: Should receive a permission error when attempting to insert a
        *               filter for a client_id that you don't have application permission to
        */
  // await start("hive")
  //     .post(`/filter`)
  //     .send({
  //         client_id: 6,
  //         name: 'E2E Hive filter',
  //         params: 'resize=width_300-height_300'
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         console.log(body);
  //         if(!get(body, 'error', false)) {
  //             logErrors("Expected a permision error, but no error returned.");
  //             next(true);
  //         } else {
  //             next();
  //         }
  //     })
  //     .expectStatus(400)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /* Test successful POST (with default settings)
        *   Expections:     Should receive 200 status
        *                   Should get back an ID
        *                   Should have save data that was sent
        */
  const hiveFilter = {
    client_id: 14,
    name: "E2E Hive filter",
    params: "resize=width_300-height_300"
  };
  const savedHiveFilter = {
    // client_id: 14, TODO uncomment if we are going to return the client_id with the data
    name: "E2E Hive filter",
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 7
  };
  await start("hive")
    .post(`/filter`)
    .send(hiveFilter)
    .expectKey("data")
    .expect((res, body, next) => {
      const id = get(body, "data.id", false);
      if (id) {
        hiveFilterId = id;
        next();
      } else {
        logErrors("POST (HIVE): Expected an ID, but none returned.");
        next(true);
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (
        JSON.stringify(data) ===
        JSON.stringify(assignIn({ id: hiveFilterId }, savedHiveFilter))
      ) {
        hiveFilterName = data.name;
        next();
      } else {
        logErrors(
          "POST (HIVE): Saved filter did not match expected object structure."
        );
        console.log(
          "Expected: ",
          JSON.stringify(assignIn({ id: hiveFilterId }, savedHiveFilter))
        );
        console.log("Received: ", JSON.stringify(data));
        next(true);
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  // Same as previous test, but needed to test application permission tests.
  /* Test successful POST (with default settings)
        *   Expections:     Should receive 200 status
        *                   Should get back an ID
        *                   Should have save data that was sent
        */
  const utahFilter = {
    client_id: 15,
    name: "E2E Utah.com filter",
    params: "resize=width_300-height_300"
  };
  const savedUtahFilter = {
    // client_id: 15, TODO uncomment if we are going to return the client_id with the data
    name: "E2E Utah.com filter",
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 7
  };
  await start("utah")
    .post(`/filter`)
    .send(utahFilter)
    .expectKey("data")
    .expect((res, body, next) => {
      const id = get(body, "data.id", false);
      if (id) {
        utahFilterId = id;
        next();
      } else {
        logErrors("POST (Utah.com): Expected an ID, but none returned.");
        next(true);
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (
        JSON.stringify(data) ===
        JSON.stringify(assignIn({ id: utahFilterId }, savedUtahFilter))
      ) {
        utahFilterName = data.name;
        next();
      } else {
        logErrors(
          "POST (Utah.com): Saved filter did not match expected object structure."
        );
        console.log(
          "Expected: ",
          JSON.stringify(assignIn({ id: utahFilterId }, savedUtahFilter))
        );
        console.log("Received: ", JSON.stringify(data));
        next(true);
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /* Test successful POST (with full structure given)
        *   Expections:     Should receive 200 status
        *                   Should get back an ID
        *                   Should have save data that was sent
        */
  const dcFilter = {
    // client_id: 6, TODO uncomment if we are going to return the client_id with the data
    name: "E2E DC filter",
    params:
      "crop=top:0|left:0|width:500|height:10&resize=width:500&order=resize,crop",
    auto_generate_on_upload: 1,
    auto_generate_on_demand: 1,
    ttl_days: 10
  };
  await start("dc")
    .post(`/filter`)
    .send(dcFilter)
    .expectKey("data")
    .expect((res, body, next) => {
      const id = get(body, "data.id", false);
      if (id) {
        dcFilterId = id;
        next();
      } else {
        logErrors("POST (DC): Expected an ID, but none returned.");
        next(true);
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (
        JSON.stringify(data) ===
        JSON.stringify(assignIn({ id: dcFilterId }, dcFilter))
      ) {
        dcFilterName = data.name;
        next();
      } else {
        logErrors(
          "POST (DC): Saved filter did not match expected object structure."
        );
        console.log(
          "Expected: ",
          JSON.stringify(assignIn({ id: dcFilterId }, dcFilter))
        );
        console.log("Received: ", JSON.stringify(data));
        next(true);
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  // ---------PUT Tests---------
  /*  Test bad PUT request (missing ID)
        *   Expectation: Should receive a 'missing ID' error.
        */
  await start("hive")
    .put(`/filter`)
    .send({
      client_id: 14
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const error = get(body, "error", null);
      if (!error || !error.includes("ID")) {
        logErrors("PUT (HIVE): Expected a 'missing ID' error.");
      }
      next();
    })
    .expectStatus(400)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test bad PUT request (missing name)
        *   Expectation: Should receive a 'missing name' error.
        */
  // await start("hive")
  //     .put(`/filter/${hiveFilterId}`)
  //     .send({
  //         client_id: 14,
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         const error = get(body, 'error', null);
  //         if(!error || !error.includes('name')) {
  //             logErrors("PUT (HIVE): Expected a 'missing name' error.");
  //             console.log('error received: ', error);
  //             console.log('data received: ', get(body, 'data', {}));
  //         }
  //         next();
  //     })
  //     .expectStatus(400)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /*  Test bad PUT request (missing params)
        *   Expectation: Should receive a 'missing params' error.
        */
  // await start("hive")
  //     .put(`/filter/${hiveFilterId}`)
  //     .send({
  //         client_id: 14,
  //         name: hiveFilterName
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         const error = get(body, 'error', null);
  //         if(!error || !error.includes('params')) {
  //             logErrors("PUT (HIVE): Expected a 'missing params' error.");
  //         }
  //         next();
  //     })
  //     .expectStatus(400)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /*  Test bad PUT request (invalid params string)
        *   Expectation: Should receive an 'invalid param' error
        */
  await start("hive")
    .put(`/filter/${hiveFilterId}`)
    .send({
      client_id: 14,
      name: hiveFilterName,
      params: "crop=invalid"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const error = get(body, "error", null);
      if (!error || !error.includes("Invalid value")) {
        logErrors("PUT (HIVE): Expected an 'invalid param' error.");
      }
      next();
    })
    .expectStatus(500)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test PUT permission error (no application permission for client_id)
        *   Expectation: Should receive a permission error when attempting to change a
        *               filter for a client_id that you don't have application permission to
        */
  await start("hive")
    .put(`/filter/${dcFilterId}`)
    .send({
      client_id: 14,
      name: dcFilterName + "!",
      params: "crop=&resize=width:&order=resize,crop"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const error = get(body, "error", null);
      if (
        !error ||
        !error.includes(
          "You do not have permission to perform the requested action with this resource"
        )
      ) {
        logErrors("PUT (HIVE): Expected a 'permission' error.");
      }
      next();
    })
    .expectStatus(401)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test PUT permission error (not own client_id)
        *   Expectation: Should receive a permission error when attempting to insert a filter for a client_id that is not yours.
        */
  await start("dc")
    .put(`/filter/${hiveFilterId}`)
    .send({
      client_id: 6,
      name: hiveFilterName + "!",
      params: "crop=&resize=width:&order=resize,crop"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const error = get(body, "error", null);
      if (
        !error ||
        !error.includes(
          "You do not have permission to perform the requested action with this resource"
        )
      ) {
        logErrors("PUT (DC): Expected a 'permission' error.");
      }
      next();
    })
    .expectStatus(401)
    .end()
    .then(report)
    .catch(reportErrors);

  /* Test successful PUT (only sending some values)
        *   Expections:     Should receive 200 status
        *                   Response should match expected structure
        */
  const response = {
    id: dcFilterId,
    name: dcFilterName + "!",
    params: "crop=&resize=width:&order=resize,crop",
    auto_generate_on_upload: 1,
    auto_generate_on_demand: 1,
    ttl_days: 10
  };
  await start("dc")
    .put(`/filter/${dcFilterId}`)
    .send({
      client_id: 6,
      name: dcFilterName + "!",
      params: "crop=&resize=width:&order=resize,crop"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", null);
      if (JSON.stringify(data) !== JSON.stringify(response)) {
        logErrors(
          "PUT (DC | some values sent): Response did not match expected structure."
        );
        console.log("Expected: ", JSON.stringify(response));
        console.log("Received: ", JSON.stringify(data));
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /* Test successful PUT (sending all values)
            *   Expections:     Should receive 200 status
            *                   Response should match expected structure
            */
  const response2 = {
    id: dcFilterId,
    name: dcFilterName,
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 5
  };
  await start("dc")
    .put(`/filter/${dcFilterId}`)
    .send({
      client_id: 6,
      name: dcFilterName,
      params: "resize=width_300-height_300",
      auto_generate_on_upload: 0,
      auto_generate_on_demand: 0,
      ttl_days: 5
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", null);
      if (JSON.stringify(data) !== JSON.stringify(response2)) {
        logErrors(
          "PUT (DC | all values sent): Response did not match expected structure."
        );
        console.log("Expected: ", JSON.stringify(response2));
        console.log("Received: ", JSON.stringify(data));
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  // ---------GET Tests---------
  /*  Test GET one by id (Hive filter)
        *   Expectations:   Should not get an array of results.
        *                   Should get expected body. Id should match 'hiveFilterId'
        */
  const getResult = {
    name: "E2E Hive filter",
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 7
  };
  await start("hive")
    .get(`/filter/${hiveFilterId}`)
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", false);
      if (Array.isArray(data)) {
        logErrors(
          "GET by ID (HIVE): Expected a single object, but got an array."
        );
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (
        JSON.stringify(data) !==
        JSON.stringify(assignIn({ id: hiveFilterId }, getResult))
      ) {
        logErrors(
          "GET by ID (HIVE): Response body does not match expected structure."
        );
        console.log(
          "Expected",
          JSON.stringify(assignIn({ id: hiveFilterId }, getResult))
        );
        console.log("Received", JSON.stringify(data));
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET one by id (DC filter)
        *   Expectations:   Should not get an array of results.
        *                   Should get expected body. Id should match 'hiveFilterId'
        */
  const getResult2 = {
    name: "E2E DC filter",
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 5
  };
  await start("dc")
    .get(`/filter/${dcFilterId}`)
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", false);
      if (Array.isArray(data)) {
        logErrors(
          "GET by ID (DC): Expected a single object, but got an array."
        );
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (
        JSON.stringify(data) !==
        JSON.stringify(assignIn({ id: dcFilterId }, getResult2))
      ) {
        logErrors(
          "GET by ID (DC): Response body does not match expected structure."
        );
        console.log(
          "Expected: ",
          JSON.stringify(assignIn({ id: dcFilterId }, getResult2))
        );
        console.log("Received: ", JSON.stringify(data));
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET by name
        *   Expectations:   Should receive an array
        *                   We should get an item with the name we are searching for
        *                   The matched item should match the structure expected
        *                   We should not get a result that does not match
        */
  const getResult3 = {
    name: "E2E Hive filter",
    params: "resize=width_300-height_300",
    auto_generate_on_upload: 0,
    auto_generate_on_demand: 0,
    ttl_days: 7
  };
  await start("hive")
    .get(`/filter`)
    .send({
      name: hiveFilterName
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", false);
      if (!Array.isArray(data)) {
        logErrors("GET by name: Expected data to be an array.");
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      let found = false;
      const data = get(body, "data", false);
      data.forEach(filterItem => {
        if (get(filterItem, "name", "") === hiveFilterName) {
          found = true;
        }
      });
      if (!found) {
        logErrors("GET by name: Did not find the filter with the name given.");
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      let foundOther = false;
      const data = get(body, "data", false);
      data.forEach(filterItem => {
        if (!get(filterItem, "name", "") === hiveFilterName) {
          foundOther = true;
        }
      });
      if (foundOther) {
        logErrors("GET by name: Found a filter with a name that didn't match.");
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      let matches = false;
      const data = get(body, "data", false);
      data.forEach(filterItem => {
        if (
          get(filterItem, "name", "") === hiveFilterName &&
          JSON.stringify(filterItem) ===
            JSON.stringify(assignIn({ id: hiveFilterId }, getResult3))
        ) {
          matches = true;
        }
      });
      if (!matches) {
        logErrors(
          "GET by name: The filter item found did not match the expected structure."
        );
        console.log(
          "Expected: ",
          JSON.stringify(assignIn({ id: hiveFilterId }, getResult3))
        );
        console.log("Received: ", JSON.stringify(filterItem));
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET all
        *   Expectation:    We should get back an array of filters
        *   Note: We are using this test to set the offsetIndexFilterId (used for the offset test)
        */
  await start("hive")
    .get(`/filter`)
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (!Array.isArray(data)) {
        logErrors("GET all: Expected an array of filters.");
        next(true);
      } else {
        const filterAtOffset = find(data, (item, idx) => {
          return idx === offsetIndex;
        });
        offsetIndexFilterId = get(filterAtOffset, "id", null);
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET with limit
        *   Expectation:    We should only get back the same number of results as the limit set.
        */
  await start("hive")
    .get(`/filter`)
    .send({
      limit: searchLimit
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (data.length !== searchLimit) {
        logErrors("GET limit: Got unexpected number of results.");
        console.log("Expected: ", searchLimit);
        console.log("Received: ", data.length);
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET with offset
        *   Expectations:   Should be an array of results
        *                   The ID of the first result should be the same as the offsetIndexFilterId
        */
  await start("hive")
    .get(`/filter`)
    .send({
      offset: offsetIndex
    })
    .expectKey("data")
    .expect((res, body, next) => {
      const data = get(body, "data", null);
      if (!Array.isArray(data)) {
        logErrors("GET by offset: Expected data to be an array.");
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const firstItem = first(get(body, "data", {}));
      if (get(firstItem, "id", null) !== offsetIndexFilterId) {
        logErrors(
          `GET by offset: Expected first filter in data array to have ID: ${offsetIndexFilterId}, received: ${
            firstItem.id
          }`
        );
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  // orderBy did not change result order. I wasn't perfectly sure what to do here. Let's add this test after the rewrite.
  /*  Test GET with orderBy (by id)
        *   Expectation:    The id's should be in order
        */
  // await start("hive")
  //     .get('/filter')
  //     .send({
  //         orderBy: 'id'
  //     })
  //     .expectKey('data')
  //     .expect((res, body, next) => {
  //         logErrors('')
  //         next(false);
  //     })
  //     .expectStatus(200)
  //     .end()
  //     .then(report)
  //     .catch(reportErrors);

  /*  Test GET with application permission. (Hive) Should get other client's (Utah.com) filters
        *   Expectation:    Should get an array of results
        *                   Should get Utah.com Filter
        */
  await start("hive")
    .get(`/filter`)
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors(
          "GET by application permission: Expected an array of results"
        );
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", []);
      let found = false;
      data.forEach(filterItem => {
        if (filterItem.id === utahFilterId) {
          found = true;
        }
      });
      if (!found) {
        logErrors(
          "GET by application permission: Expected to find Utah.com filter."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET, should not get another client's filter
        *   Expectations:   Should not get DC's filter in our result set (empty data from response).
        *                   Should not get an error. Just empty result.
        */
  await start("hive")
    .get(`/filter/${dcFilterId}`)
    .expectKey("data")
    .expect((res, body, next) => {
      const error = get(body, "error", null);
      if (error !== null) {
        logErrors(
          "GET by ID (getting another clients filter): Unexpected error. Expected error to be null"
        );
        next(true);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      if (JSON.stringify({}) !== JSON.stringify(data)) {
        logErrors(
          "GET by ID (getting another clients filter): Unexpected data structure found."
        );
        console.log("Expected: {}");
        console.log("Received: ", JSON.stringify(data));
        next(true);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (id)
        *   Expectations:   Should get an array of results
        *                   Should only get id field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "id"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors("GET id fields: Expected results to be an array.");
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("id")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("name") ||
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("auto_generate_on_demand") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET id fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (name)
        *   Expectation:    Should only get name field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "name"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors("GET name fields: Expected results to be an array.");
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("name")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("id") ||
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("auto_generate_on_demand") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET name fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (params)
        *   Expectation:    Should only get params field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "params"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors("GET params fields: Expected results to be an array.");
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("params")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("id") ||
          item.hasOwnProperty("name") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("auto_generate_on_demand") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET params fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (auto_generate_on_upload)
        *   Expectation:    Should only get auto_generate_on_upload field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "auto_generate_on_upload"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors(
          "GET auto_generate_on_upload fields: Expected results to be an array."
        );
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("auto_generate_on_upload")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("id") ||
          item.hasOwnProperty("name") ||
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_demand") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET auto_generate_on_upload fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (auto_generate_on_demand)
        *   Expectation:    Should only get auto_generate_on_demand field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "auto_generate_on_demand"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors(
          "GET auto_generate_on_demand fields: Expected results to be an array."
        );
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("auto_generate_on_demand")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("id") ||
          item.hasOwnProperty("name") ||
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET auto_generate_on_demand fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (ttl_days)
        *   Expectation:    Should only get ttl_days field
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "ttl_days"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors("GET ttl_days fields: Expected results to be an array.");
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKey = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("ttl_days")) {
          hasExpectedKey = true;
        }
        if (
          item.hasOwnProperty("id") ||
          item.hasOwnProperty("name") ||
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("auto_generate_on_demand")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKey || hasUnexpectedKey) {
        logErrors(
          "GET ttl_days fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /*  Test GET fields (id and name)
        *   Expectation:    Should only get id and name fields
        */
  await start("hive")
    .get(`/filter`)
    .send({
      fields: "id,name"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (!Array.isArray(get(body, "data", null))) {
        logErrors("GET id and name fields: Expected results to be an array.");
        next(false);
      } else {
        next();
      }
    })
    .expect((res, body, next) => {
      const data = get(body, "data", {});
      let hasExpectedKeys = false;
      let hasUnexpectedKey = false;
      data.forEach(item => {
        if (item.hasOwnProperty("id") && item.hasOwnProperty("name")) {
          hasExpectedKeys = true;
        }
        if (
          item.hasOwnProperty("params") ||
          item.hasOwnProperty("auto_generate_on_upload") ||
          item.hasOwnProperty("auto_generate_on_demand") ||
          item.hasOwnProperty("ttl_days")
        ) {
          hasUnexpectedKey = true;
        }
      });
      if (!hasExpectedKeys || hasUnexpectedKey) {
        logErrors(
          "GET id and name fields: The fields returned did not match the expected fields."
        );
        next(false);
      } else {
        next();
      }
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  // -- DELETE filters created by test

  console.log(`Deleting filter with ID: ${hiveFilterId}`);
  await start("hive")
    .del(`/filter/${hiveFilterId}`)
    .send({
      id: hiveFilterId,
      deleteKey: "gpXHu7ipNtL94kvm"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (get(body, "error", false)) {
        logErrors(
          "DELETE (HIVE): Error deleting filter with id: ",
          hiveFilterId
        );
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  console.log(`Deleting filter with ID: ${utahFilterId}`);
  await start("utah")
    .del(`/filter/${utahFilterId}`)
    .send({
      id: utahFilterId,
      deleteKey: "gpXHu7ipNtL94kvm"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (get(body, "error", false)) {
        logErrors(
          "DELETE (Utah): Error deleting filter with id: ",
          utahFilterId
        );
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  console.log(`Deleting filter with ID: ${dcFilterId}`);
  await start("dc")
    .del(`/filter/${dcFilterId}`)
    .send({
      id: dcFilterId,
      deleteKey: "gpXHu7ipNtL94kvm"
    })
    .expectKey("data")
    .expect((res, body, next) => {
      if (get(body, "error", false)) {
        logErrors("DELETE (DC): Error deleting filter with id: ", dcFilterId);
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  return true;
}
