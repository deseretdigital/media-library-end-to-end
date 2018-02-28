import hippie from 'hippie';
import get from 'lodash.get';

import { start, report, logErrors, reportErrors, preview, promiseTimeout, suite } from 'run';

export default async function run() {
    suite('Posting and getting pools');

    let hivePoolId = null;
    let utahPoolId = null;

    // Test bad request
    await start('utah')
        .post(`/pool`)
        .send({
            "name": "Test bad request Utah.com Pool",
            "client_access": {
                "15": [
                    "edit"
                ]
            },
            "storage_id": 1
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = true;
            const error = get(body, 'error', false);
            if(error) {
                testError = false;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const errorId = get(body, 'errorId', false);
            if(errorId) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const data = get(body, 'data', false);
            if(data === null) { testError = false; }
            next(testError);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test post with ID in post
    await start('utah')
        .post(`/pool/1`)
        .send({
            "name": "Test Utah.com Pool",
            "client_access": {
                "15": [
                    "edit"
                ],
                "14": [
                    "view"
                ]
            },
            "storage_id": 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = true;
            const error = get(body, 'error', false);
            if(error) {
                testError = false;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const errorId = get(body, 'errorId', false);
            if(errorId) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const data = get(body, 'data', false);
            if(data === null) { testError = false; }
            next(testError);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test successful post, with 1 client_access
    await start('hive')
        .post(`/pool`)
        .send({
            "name": "Test Hive Pool",
            "client_access": {
                "14": [
                    "edit"
                ]
            },
            "storage_id": 14
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = true;
            const id = get(body, 'data.id', false);
            if(id) {
                hivePoolId = id;
                testError = false;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const clientId = get(body, 'data.client_id', false);
            if(clientId && clientId === 14) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const name = get(body, 'data.name', false);
            if(name && name === 'Test Hive Pool') { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const clientAccess = get(body, 'data.client_access', false);
            if(clientAccess && JSON.stringify({ '14': [ 'edit' ] }) === JSON.stringify(clientAccess)) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const storageId = get(body, 'data.storage_id', false);
            if(storageId && storageId === 14) { testError = false; }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test successful post, with 2 client_access
    await start('utah')
        .post(`/pool`)
        .send({
            "name": "Test Utah.com Pool",
            "client_access": {
                "14": [
                    "view"
                ],
                "15": [
                    "edit"
                ]
            },
            "storage_id": 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = true;
            const id = get(body, 'data.id', false);
            if(id) {
                utahPoolId = id;
                testError = false;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const clientId = get(body, 'data.client_id', false);
            if(clientId && clientId === 15) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const name = get(body, 'data.name', false);
            if(name && name === 'Test Utah.com Pool') { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const clientAccess = get(body, 'data.client_access', false);
            if(clientAccess && JSON.stringify({ '14': [ 'view' ], '15': [ 'edit' ] }) === JSON.stringify(clientAccess)) { testError = false; }
            next(testError);
        })
        .expect((res, body, next) => {
            let testError = true;
            const storageId = get(body, 'data.storage_id', false);
            if(storageId && storageId === 15) { testError = false; }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test get with result owned pool
    await start('hive')
        .get('/pool')
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = false;
            const data = get(body, 'data', false);
            if(!Array.isArray(data) || data.length === 0) {
                err = true;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            let found = false;
            data.forEach((pool) => {
                if(hivePoolId === pool.id) {
                    found = true;
                }
            });
            next(!found);
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
            let testError = false;
            const data = get(body, 'data', false);
            if(!Array.isArray(data) || data.length === 0) {
                err = true;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            const data = get(body, 'data', false);
            let found = false;
            data.forEach((pool) => {
                if(pool.id === utahPoolId && pool.client_access.hasOwnProperty('14')) {
                    found = true;
                }
            });
            next(!found);
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
            let testError = true;
            const id = get(body, 'data.id', false);
            if(id === hivePoolId) {
                testError = false;
            }
            next(testError);
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
            let testError = true;
            const data = get(body, 'data', {});
            if(JSON.stringify({}) === JSON.stringify(data)) {
                testError = false;
            }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Test put with successful update
    await start('utah')
        .put(`/pool`)
        .send({
            "id": utahPoolId,
            "name": "Test Utah.com Pool",
            "client_access": {
                "15": [
                    "edit"
                ]
            },
            "storage_id": 15
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = true;
            const id = get(body, 'data.id', false);
            if(id === utahPoolId) {
                testError = false;
            }
            next(testError);
        })
        .expect((res, body, next) => {
            const clientAccess = get(body, 'data.client_access', false);
            let testError = true;
            if(JSON.stringify({ "15": [ "edit" ] }) === JSON.stringify(clientAccess)) {
                testError = false;
            }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Delete pools added by tests
    await start('hive')
        .del(`/pool/${hivePoolId}`)
        .send({
            "id": hivePoolId,
            "deleteKey": "gpXHu7ipNtL94kvm"
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = false;
            const error = get(body, 'error', false);
            if(error) {
                testError = true;
            }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Delete pools added by tests
    await start('utah')
        .del(`/pool/${utahPoolId}`)
        .send({
            "id": utahPoolId,
            "deleteKey": "gpXHu7ipNtL94kvm"
        })
        .expectKey('data')
        .expect((res, body, next) => {
            let testError = false;
            const error = get(body, 'error', false);
            if(error) {
                testError = true;
            }
            next(testError);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    return true;
}