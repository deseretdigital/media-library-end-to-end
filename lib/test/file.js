import hippie from 'hippie';
import imagemagick from 'imagemagick';
import fs from "fs";
import { StringDecoder } from 'string_decoder';
import { Base64 } from 'js-base64';

import { start, report, logErrors, reportErrors, preview, promiseTimeout, suite } from 'run';

export default async function run() {
    suite('File endpoint');
    const idHash = "2343384831";
    const notFoundIdHash = "2343384832";
    const invalidIdHash = "12345";
    /*
        file is just the image endpoint,
        get all the sources from the doc endpoint?

        What do I do to check the returned file?
                - should I save the response from lawliet and compare?
        **Renditions**
            for one need to request them which should be easy, but how do I determine something like quality?
            gravity?
            interlace?
            can we bring in imagemagick? can it determine that from an image?
            height and width should be easy enough I think

            Filter in the file endpoint?

            Need to test the post endpoint as well
    */

    // File not found with id hash
    /**
    * Expectations:
    * 1. We get an error message when we send a hash that doesn't exist
    */
    await start('hive')
        .get(`/file/${notFoundIdHash}`)
        // We should have no data
        .expectKey('data')
        .expect((res, body, next) => {
            const err = body.data;
            if (err) {
                logErrors("Error: We found a file when we passed a hash that shouldn't exist");
            }
            next();
        })
        .expectKey('error')
        // Error message should come back in the request
        .expect((res, body, next) => {
            const err = body.error.indexOf(`Invalid file ID '${notFoundIdHash}'`) === -1;
            if (err) {
                logErrors("Error: Returned error message did not match expected error message");
            }
            next();
        })
        .expectStatus(404)
        .end()
        .then(report)
        .catch(reportErrors);

    // Invalid hash
    /**
    * Expectations:
    * 1. We get an error message when we send a hash that is invalid
    */
    await start('hive')
        .get(`/file/${invalidIdHash}`)
        // We should have no data
        .expectKey('data')
        .expect((res, body, next) => {
            const err = body.data;
            if (err) {
                logErrors("Error: We found a file when we passed a hash that shouldn't exist");
            }
            next();
        })
        .expectKey('error')
        // Error message should come back in the request
        .expect((res, body, next) => {
            const err = body.error.indexOf(`Invalid file ID '${invalidIdHash}'`) === -1;
            if (err) {
                logErrors("Error: Invalid hash error message returned was not what was expected");
            }
            next();
        })
        .expectStatus(404)
        .end()
        .then(report)
        .catch(reportErrors);

    // No id hash
    /**
    * Expectations:
    * 1. We get an error message when we hit the endpoint with no id
    */
    await start('hive')
        .get(`/file`)
        // We should have no data
        .expectKey('data')
        .expect((res, body, next) => {
            const err = body.data;
            if (err) {
                logErrors("Error: We found a file when we passed a hash that shouldn't exist");
            }
            next();
        })
        .expectKey('error')
        // We should get a warning message
        .expect((res, body, next) => {
            const err = body.error.indexOf(`Error: Missing ID`) === -1;
            if (err) {
                logErrors("Error: Missing ID error message returned was not what was expected");
            }
            next();
        })
        .expectStatus(404)
        .end()
        .then(report)
        .catch(reportErrors);

    // No id hash
    /**
    * Expectations:
    * 1. We get an image returned based on the id hash
    */
    await start('hive', null, null, false)
        .get(`/file/${idHash}`)
        // We should have data?
        // .expectKey('data')
/*      .use((res, body, next) => {
            var contentType = res.headers['content-type'] || ''
            var mime = contentType.split(';')[0];
            // Only use this middleware for content-type: application/octet-stream
            // if(mime != 'application/octet-stream') {
            //     next();
            // }
            var data = '';
            res.setEncoding('binary');
            res.on('data', function(chunk) { 
               data += chunk;
           });
            res.on('end', function() {
              res.rawBody = data;
              next();
          });
        })*/
        .expect((res, body, next) => {
            // console.log("buffer", buffer);
            const contentType = res.headers['content-type'] || '';
            const contentLength = res.headers['content-length'] || 0;
            const responseFromChrome = "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";
            const decode = new StringDecoder("utf8");
            var mime = contentType.split(';')[0];
            let buffer = Buffer.from(body, "binary").toString("utf8");
            let byteArray = new Uint8Array(buffer, Buffer.byteLength(body, 'utf82') - contentLength);
            // console.log("res", buffer.substr(Buffer.byteLength(body, 'utf82') - contentLength));
            console.log(buffer);
/*            fs.writeFileSync(__dirname + '/../img/HELLO.' + mime.split('/')[1], body, 'utf8', (err) => {
                if (err) {
                    logErrors(err);
                }
            });
            fs.writeFileSync(__dirname + '/../img/HELLO.txt', body, 'utf8', (err) => {
                if (err) {
                    logErrors(err);
                }
            });*/
            // console.log("res", res.headers['content-type']);
            /*imagemagick.identify(foo, (err, metadata) => {
                if (err) {
                    logErrors(err);
                }
                // console.log("metadata", metadata);
            });*/
            // const err = body.data;
/*            if (err) {
                logErrors("Error: We found a file when we passed a hash that shouldn't exist");
            }
*/            next();
        })
        // .expectKey('error')
        // // We should get a warning message
        // .expect((res, body, next) => {
        //     const err = body.error.indexOf(`Error: Missing ID`) === -1;
        //     if (err) {
        //         logErrors("Error: Missing ID error message returned was not what was expected");
        //     }
        //     next();
        // })
        .expectStatus(200)
        .end()
        .then(report)
        .catch(reportErrors);

    return true;
}