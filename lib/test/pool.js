import hippie from 'hippie';
import get from 'lodash.get';
import assignIn from 'lodash.assignin';

import { start, report, logErrors, reportErrors, preview, promiseTimeout, suite } from 'run';

export default async function run() {
    suite('Posting and getting pools');

    let hivePoolId = null;
    let utahPoolId = null;

    // Test bad POST request
    // Expectations:
        // Should receive an error.
        // Should get an empty body.
    await start('utah')
        .post(`/pool`)
        .send({
            name: "Test bad request Utah.com Pool",
            client_access: {
                15: [
                    "edit"
                ]
            },
            storage_id: 1
        })
        .expectKey('data')
        .expect((res, body, next) => {
            if(!get(body, 'error', false)) {
                logErrors('PUT (UTAH): Expected an error.');
                next(true);
            } else {
                next();
            }
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', null);
            if(data !== null) {
                logErrors('PUT (UTAH): Expected data to be null. Received: ', JSON.stringify(data));
                next(true);
            } else {
                next();
            }
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test post with ID in post
    // Expectations:
        // Should receive an error.
        // Should get an empty body.
    await start('utah')
        .post(`/pool/1`)
        .send({
            name: "Test Utah.com Pool",
            client_access: {
                15: [
                    "edit"
                ],
                14: [
                    "view"
                ]
            },
            storage_id: 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            if(!get(body, 'error', false)) {
                logErrors('PUT with ID (UTAH): Expected an error.');
                next(true);
            } else {
                next();
            }
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', null);
            if(data !== null) {
                logErrors('PUT with ID (UTAH): Expected data to be null. Received: ', JSON.stringify(data));
                next(true);
            } else {
                next();
            }
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test successful post, with 1 client_access
    // Expectations:
        // Should get an ID. (saving this for later tests)
        // Should receive expected structure.
    const hiveResult = {
        client_id: 14,
        name: "Test Hive Pool",
        client_access: {
            14: [
                "edit"
            ]
        },
        storage_id: 14
    };
    await start('hive')
        .post(`/pool`)
        .send({
            name: "Test Hive Pool",
            client_access: {
                14: [
                    "edit"
                ]
            },
            storage_id: 14
        })
        .expectKey('data')
        .expect((res, body, next) => {
            const id = get(body, 'data.id', false);
            if(id) {
                hivePoolId = id;
                next();
            } else {
                logErrors('POST successfull (HIVE): No ID received')
                next(true);
            }
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            if(JSON.stringify(data) !== JSON.stringify(assignIn({ id: hivePoolId }, hiveResult))) {
                logErrors('POST successfull (HIVE): Unexpected structure received');
                console.log('Expected: ', JSON.stringify(assignIn({ id: hivePoolId }, hiveResult)));
                console.log('Received: ', JSON.stringify(data));
                next(false);
            } else {
                next();
            }
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test successful post, with 2 client_access
    // Expectations:
        // Should get an ID. (saving this for later tests)
        // Should receive expected structure.
    const utahResult = {
        client_id: 15,
        name: "Test Utah.com Pool",
        client_access: {
            14: [
                "view"
            ],
            15: [
                "edit"
            ]
        },
        storage_id: 15
    };
    await start('utah')
        .post(`/pool`)
        .send({
            name: "Test Utah.com Pool",
            client_access: {
                14: [
                    "view"
                ],
                15: [
                    "edit"
                ]
            },
            storage_id: 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            const id = get(body, 'data.id', false);
            if(id) {
                utahPoolId = id;
                next();
            } else {
                logErrors('POST successfull (UTAH): No ID received')
                next(true);
            }
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            if(JSON.stringify(data) !== JSON.stringify(assignIn({ id: utahPoolId }, utahResult))) {
                logErrors('POST successfull (UTAH): Unexpected structure received');
                console.log('Expected: ', JSON.stringify(assignIn({ id: utahPoolId }, utahResult)));
                console.log('Received: ', JSON.stringify(data));
                next(false);
            } else {
                next();
            }
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test get with result owned pool
    // Expectations:
        // Should get an array of data
        // Should receive expected structure.
    await start('hive')
        .get('/pool')
        .expectKey('data')
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            if(!Array.isArray(data) || data.length === 0) {
                logErrors('GET owned pools (HIVE): Expected data to be an array');
            }
            next();
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            let found = false;
            data.forEach((pool) => {
                if(hivePoolId === pool.id) {
                    found = true;
                }
            });
            if(!found) {
                logErrors('GET owned pools (HIVE): Did not find the pool with id: ', hivePoolId);
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test get/all with result not owned, but have access to
    await start('hive')
        .get('/pool/all')
        .expectKey('data')
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            if(!Array.isArray(data) || data.length === 0) {
                logErrors('GET all pools (HIVE): Expected an array of results.');
            }
            next();
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            let found = false;
            data.forEach((pool) => {
                if(pool.id === utahPoolId && pool.client_access.hasOwnProperty('14')) {
                    found = true;
                }
            });
            if(!found) {
                logErrors(`GET all pools (HIVE): Could not find pool in results. id: ${hivePoolId}`);
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test get/id with result owned
    await start('hive')
        .get(`/pool/${hivePoolId}`)
        .expectKey('data')
        .expect((res, body, next) => {
            const id = get(body, 'data.id', false);
            if(id !== hivePoolId) {
                logErrors(`GET pool by owned id (HIVE): Did not find pool with id: ${hivePoolId}`);
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test get/id with result not owned
    await start('hive')
        .get(`/pool/${utahPoolId}`)
        .expectKey('data')
        .expect((res, body, next) => {
            const data = get(body, 'data', {});
            if(JSON.stringify({}) !== JSON.stringify(data)) {
                logErrors('GET pool by non-owned id (HIVE): Expected an empty result');
                console.log('Found', JSON.stringify(data));
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test put with successful update
    let updatedPool = {
        id: utahPoolId,
        client_id: 15,
        name: "Test Utah.com Pool",
        client_access: {
            15: [
                "edit"
            ]
        },
        storage_id: 15
    };
    await start('utah')
        .put(`/pool`)
        .send({
            id: utahPoolId,
            name: "Test Utah.com Pool",
            client_access: {
                15: [
                    "edit"
                ]
            },
            storage_id: 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            if(JSON.stringify(data) !== JSON.stringify(updatedPool)) {
                logErrors(`PUT (Utah): Expected returned data to match structure.`);
                console.log('Expected: ', JSON.stringify(updatedPool));
                console.log('Received: ', JSON.stringify(data));
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Delete pools added by tests
    console.log(`Deleting pool with ID: ${hivePoolId}`);
    await start('hive')
        .del(`/pool/${hivePoolId}`)
        .send({
            id: hivePoolId,
            deleteKey: "gpXHu7ipNtL94kvm"
        })
        .expectKey('data')
        .expect((res, body, next) => {
            if(get(body, 'error', false)) {
                logErrors(`DELETE (HIVE): Deleting failed for ID: ${hivePoolId}`);
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Delete pools added by tests
    console.log(`Deleting pool with ID: ${utahPoolId}`);
    await start('utah')
        .del(`/pool/${utahPoolId}`)
        .send({
            id: utahPoolId,
            deleteKey: "gpXHu7ipNtL94kvm"
        })
        .expectKey('data')
        .expect((res, body, next) => {
            if(get(body, 'error', false)) {
                logErrors(`DELETE (UTAH): Deleting failed for ID: ${utahPoolId}`);
            }
            next();
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    return true;
}
