import hippie from 'hippie';

import { start, report, logErrors, reportErrors, preview, promiseTimeout, suite } from 'run';

export default async function run() {
    // const random = Math.random().toString(36).substring(7);
    // suite('Putting bad content should fail in validation step');
    // const contentSentAsArray = [{
    //     id: "5a6669567cac297a46252413",
    //     content_type: 'story',
    //     content_data: {
    //         body: {},
    //         sites: ['beetdiggerfan'],
    //         title: `End-to-end test run (PUT update ${random})`
    //     },
    //     site_content_id: 1152
    // }];
    // await start(null, 'beetdiggerfan')
    //     .put(`content/5a6669567cac297a46252413`)
    //     .send(contentSentAsArray)
    //     .expectValue(
    //         'message',
    //         'Expected argument of type "array or Traversable and ArrayAccess", "string" given',
    //     )
    //     .expectStatus(500)
    //     .end()
    //     .then(report)
    //     .catch(reportErrors);
    // return true;
}
