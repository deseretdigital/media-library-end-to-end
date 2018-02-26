import hippie from 'hippie';

import { start, report, logErrors, reportErrors, preview, promiseTimeout, suite } from 'run';

export default async function run() {
    suite('Searching should return appropriate results');

    const queryWithLimit = {
        'q': '\*:*',
        'offset': '0',
        'sort': 'date_created:desc',
        'limit': 40
    };
    const queryWithPoolIds = {
        'q': '\*:*',
        'offset': '0',
        'sort': 'date_created:desc',
        'limit': 40,
        'pool_ids[0]': '357'
    };
    const queryWithFileHash = {
        'q': '7cb3f8f2e64d1a9ebfa1eb0230b1de00',
        'offset': '0',
        'sort': 'date_created:desc',
        'limit': 40
    };
    const queryWithSearchPhrase = {
        'q': 'Hello World',
        'offset': '0',
        'sort': 'date_created:desc',
        'limit': 40
    };
    const clientToPoolId = {
        '331': 21,
        '357': 20
    };

    // Search with limit and sorted
    await start('hive')
        .get(`/search`)
        .qs(queryWithLimit)
        .expectKey('data')
        // Expect body data to be returned
        .expect((res, body, next) => {
            const err = !Array.isArray(body.data) || body.data.length === 0;
            next(err);
        })
        // Expect length to be the size of the limit filter
        .expect((res, body, next) => {
            const err = assertBodyLength(queryWithLimit.limit, body.data.length);
            next(err);
        })
        // Expect dates are sorted in descending order
        .expect((res, body, next) => {
            const err = assertDateDesc(body.data);
            next(err);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Search with specific pool id
    await start('hive')
        .get(`/search`)
        .qs(queryWithPoolIds)
        .expectKey('data')
        // Only searching for one pool
        .expect((res, body, next) => {
            const err = body.data.some((media) => {
                if (media.pools.length !== 1) {
                    return true;
                }
            })
            next(err);
        })
        // Make sure pool id references proper client id
        .expect((res, body, next) => {
            const err = assertClientId(clientToPoolId, body.data);
            next(err);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Search by file hash
    await start('hive')
        .get(`/search`)
        .qs(queryWithFileHash)
        .expectKey('data')
        // File hash should only return 1 result
        .expect((res, body, next) => {
            next(body.data.length !== 1);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Search with a phrase
    await start('hive')
        .get(`/search`)
        .qs(queryWithSearchPhrase)
        .expectKey('data')
        // Search phrase should have at least 1 result
        .expect((res, body, next) => {
            next(body.data.length === 0);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    // Search with nothing set
    await start('hive')
        .get(`/search`)
        .qs({})
        .expectKey('error')
        // We should fail
        .expect((res, body, next) => {
            next(body.error.length === 0);
        })
        .expectStatus(400)
        .end()
        .then(report)
        .catch(reportErrors);

    // Search with just a query string
    await start('hive')
        .get(`/search`)
        .qs({'q': "hello"})
        .expectKey('data')
        // We should have results
        .expect((res, body, next) => {
            next(body.data.length === 0);
        })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    return true;
}

function assertBodyLength(expectedLength = 40, actualLength = 0) {
    return expectedLength !== actualLength;
}

function assertDateDesc(data) {
    let date = null;
    return data.some((media) => {
        if (date && media.date_created > date) {
            return true;
        }
        date = media.date_crated;
    });
}

function assertClientId(clientToPoolId, data) {
    return data.some((media) => {
        if (media.client_id !== clientToPoolId[media.pools[0].toString()]) {
            return true;
        }
    });
}