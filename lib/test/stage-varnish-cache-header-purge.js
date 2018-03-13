import config from "../../config.dev.json";

import { start, report, logErrors, reportErrors, suite } from 'run';

const { stagevarnish } = config;

export default async function run() {
    suite('Cache-Control header should be unset when sent to varnish');

    const idHash = "2343384831";

    // Search with limit and sorted
    /**
    * Expectations:
    * 1. Returned header should not contain Cache-Control
    */
    await start('hive', stagevarnish, null, false)
        .get(`/file/${idHash}`)
        .header("Cache-Control", "no-cache")
        // Expect body data to be returned
        .expect((res, body, next) => {
            const err = res.headers['Cache-Control'];
            if (err) {
                logErrors("Error: Cache-Control was not unset from the varnish request");
            }
            next();
        })
        .end()
        .then(report)
        .catch(reportErrors);

    return true;
}