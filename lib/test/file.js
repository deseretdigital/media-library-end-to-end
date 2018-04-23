import hippie from "hippie";
import imagemagick from "imagemagick";
import config from "../../config.dev.json";
import Crypto from "crypto";

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
  suite("File endpoint");
  // const idHash = "2343384831";
  const idHash = "21ec527041";
  const overlayHash = "58dbec2886";
  const notFoundIdHash = "2343384832";
  const invalidIdHash = "12345";
  const base = config.base;
  /*
            Need to test the post endpoint as well

            Note: there are some weaknesses with this test
                1. We can't really test that the crop is cropped, so I'm just accepting it returning an image with less pixels means it's working
                2. Same with overlay, as long as it's returning an image I'm considering it good to go
                3. ditto for quality
                4. and interlace
                5. I can't test that order executes in the proper order, but as long as everything gets done when it's set I'll call it good
    */

  /**
   * Expectations:
   * 1. We get an error message when we send a hash that doesn't exist
   */
  await start("hive")
    .get(`/file/${notFoundIdHash}`)
    // We should have no data
    .expectKey("data")
    .expect((res, body, next) => {
      const err = body.data;
      if (err) {
        logErrors(
          "Error: We found a file when we passed a hash that shouldn't exist"
        );
      }
      next();
    })
    .expectKey("error")
    // Error message should come back in the request
    .expect((res, body, next) => {
      const err =
        body.error.indexOf(`Invalid file ID '${notFoundIdHash}'`) === -1;
      if (err) {
        logErrors(
          "Error: Returned error message did not match expected error message"
        );
      }
      next();
    })
    .expectStatus(404)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. We get an error message when we send a hash that is invalid
   */
  await start("hive")
    .get(`/file/${invalidIdHash}`)
    // We should have no data
    .expectKey("data")
    .expect((res, body, next) => {
      const err = body.data;
      if (err) {
        logErrors(
          "Error: We found a file when we passed a hash that shouldn't exist"
        );
      }
      next();
    })
    .expectKey("error")
    // Error message should come back in the request
    .expect((res, body, next) => {
      const err =
        body.error.indexOf(`Invalid file ID '${invalidIdHash}'`) === -1;
      if (err) {
        logErrors(
          "Error: Invalid hash error message returned was not what was expected"
        );
      }
      next();
    })
    .expectStatus(404)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. We get an error message when we hit the endpoint with no id
   */
  await start("hive")
    .get(`/file`)
    // We should have no data
    .expectKey("data")
    .expect((res, body, next) => {
      const err = body.data;
      if (err) {
        logErrors(
          "Error: We found a file when we passed a hash that shouldn't exist"
        );
      }
      next();
    })
    .expectKey("error")
    // We should get a warning message
    .expect((res, body, next) => {
      const err = body.error.indexOf(`Error: Missing ID`) === -1;
      if (err) {
        logErrors(
          "Error: Missing ID error message returned was not what was expected"
        );
      }
      next();
    })
    .expectStatus(404)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. We get an image returned based on the id hash
   */
  await start("hive", null, null, false)
    .use(function(options, next) {
      // console.log(options);
      // modify the options for `request` here
      next(options);
    })
    .serializer(function(params, fn) {
      var err = new Error("Things went wrong");
      var res = JSON.stringify({ image: true });
      fn(null, res);
    })
    .parser(function(body, fn) {
      var err = new Error("Things went wrong ... again");
      var res = JSON.stringify({ image: true });
      fn(err, res);
    })
    .get(`/file/${idHash}`)
    // .expect((res, body, next) => {
    //   console.log(res, body, next);
    //   // imagemagick.identify(`${base}/file/2343384831`, (err, features) => {
    //   //   if (err) {
    //   //     logErrors(err);
    //   //   }
    //   // });
    //   next();
    // })
    .expectStatus(200)
    .end();
  // .then(?report)
  // .catch(reportErrors);

  /**
   * Expectations:
   * 1. We get an image if we pass in a crop
   *   note: I don't think I can verify the actual cropping so I'll accept it just returning less pixels than the original
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      let originalPixels = 5917;
      imagemagick.identify(`${base}/file/${idHash}?`, (err, features) => {
        if (err) {
          logErrors(err);
        }
        originalPixels = features["channel statistics"]["pixels"];
      });
      const crop = "top:0|left:0|width:100|height:100";
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`crop=${crop}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.format !== "GIF") {
              logErrors(
                `Error: Format returned when passing in crops was expected to be a GIF, but got a ${
                  features.format
                }`
              );
            }
            if (features["channel statistics"]["pixels"] >= originalPixels) {
              logErrors(
                `Error: Pixels returned was expected to be less than ${originalPixels}, but got ${
                  features["channel statistics"]["pixels"]
                }`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The height passed into resize should return a resized image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const resize = "height:25";
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`resize=${resize}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.format !== "GIF") {
              logErrors(
                `Error: Format returned when passing in crops was expected to be a GIF, but got a ${
                  features.format
                }`
              );
            }
            if (features.height !== 25) {
              logErrors(
                `Error: The height returned did not match the height we passed in`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The width passed into resize should return a resized image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const resize = "width:25";
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`resize=${resize}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.format !== "GIF") {
              logErrors(
                `Error: Format returned when passing in crops was expected to be a GIF, but got a ${
                  features.format
                }`
              );
            }
            if (features.width !== 25) {
              logErrors(
                `Error: The width returned did not match the width we passed in`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The width and height passed into resize should return a resized image and not keep aspect ratio
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const resize = "height:20|width:25|constrain:false";
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`resize=${resize}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.format !== "GIF") {
              logErrors(
                `Error: Format returned when passing in crops was expected to be a GIF, but got a ${
                  features.format
                }`
              );
            }
            if (features.width !== 25) {
              logErrors(
                `Error: The width returned was constrained with constrain set to false`
              );
            }
            if (features.height !== 20) {
              logErrors(
                `Error: The height returned was constrained with constrain set to false`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The overlay should return an image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const overlay = `img:${overlayHash}|height:20|width:25`;
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`overlay=${overlay}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. Grayscale should return a grayscale image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl("grayscale=true"),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            const channelStatistics = features["channel statistics"];
            if (
              !channelStatistics["gray"] ||
              channelStatistics["red"] ||
              channelStatistics["green"] ||
              channelStatistics["blue"]
            ) {
              logErrors(
                "Error: Grayscale returned something other than a grayscale image"
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. Quality should return an image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const quality = 1;
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`quality=${quality}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. Interlace should return an image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const interlace = "partition";
      imagemagick.identify(
        `${base}/file/${idHash}?` + signUrl(`interlace=${interlace}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. Order should return the properly formatted image
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const order = "crop,resize";
      const crop = "top:0|left:0|width:100|height:100";
      const resize = "height:20|width:25|constrain:false";
      let originalPixels = 5917;
      imagemagick.identify(`${base}/file/${idHash}?`, (err, features) => {
        if (err) {
          logErrors(err);
        }
        originalPixels = features["channel statistics"]["pixels"];
      });
      imagemagick.identify(
        `${base}/file/${idHash}?` +
          signUrl(`order=${order}&crop=${crop}&resize=${resize}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.format !== "GIF") {
              logErrors(
                `Error: Format returned when passing in crops was expected to be a GIF, but got a ${
                  features.format
                }`
              );
            }
            if (features.width !== 25) {
              logErrors(
                `Error: The width returned was constrained with constrain set to false`
              );
            }
            if (features.height !== 20) {
              logErrors(
                `Error: The height returned was constrained with constrain set to false`
              );
            }
            if (features["channel statistics"]["pixels"] >= originalPixels) {
              logErrors(
                `Error: Pixels returned was expected to be less than ${originalPixels}, but got ${
                  features["channel statistics"]["pixels"]
                }`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The filter should return an image without needing to sign
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const filter = "utah-hero-image-desktop";
      imagemagick.identify(
        `${base}/file/${idHash}?filter=${filter}&c=${config.clientId}`,
        (err, features) => {
          if (err) {
            logErrors(err);
          }
        }
      );
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The filter should return an image and need signing
   */
  await start("hive", null, null, false)
    .get(`/file/${idHash}`)
    .expect((res, body, next) => {
      const filter = "utah-hero-image-desktop";
      const resize = "width:28|height:28|constrain:false";
      imagemagick.identify(
        `${base}/file/${idHash}?filter=${filter}&` +
          signUrl(`resize=${resize}`),
        (err, features) => {
          if (err) {
            logErrors(err);
          }
          if (features) {
            if (features.width !== 28) {
              logErrors(
                `Error: The width returned was constrained with constrain set to false`
              );
            }
            if (features.height !== 28) {
              logErrors(
                `Error: The height returned was constrained with constrain set to false`
              );
            }
          } else {
            logErrors("Sorry, the operation timed out");
          }
        }
      );

      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  /**
   * Expectations:
   * 1. The post action should be successful
   */
  await start("hive")
    .post(`/file`)
    .send({
      clientId: "14",
      id_hash: idHash,
      post_action: "auto_generate_on_demand"
    })
    .expect((res, body, next) => {
      if (body) {
        if (body.error) {
          logErrors("Error: Post action returned " + body.error);
        }
        if (body.data) {
          if (body.data.message) {
            if (
              body.data.message.indexOf("Successfully requested renditions") ===
              -1
            ) {
              logErrors(
                "Error: Post action did not return success message instead returned " +
                  body.data.message
              );
            }
          } else {
            logErrors(
              "Error: Post action no body message returned when expected"
            );
          }
        } else {
          logErrors("Error: Post action no body data returned");
        }
      }
      next();
    })
    .expectStatus(200)
    .end()
    .then(report)
    .catch(reportErrors);

  return true;
}

function signUrl(url, cid = config.clientId) {
  let splitUrl = url.split("?");
  let pre_q = "";
  if (splitUrl.length > 1) {
    pre_q = splitUrl[0] + "?";
    splitUrl = splitUrl[1];
  } else {
    splitUrl = splitUrl[0];
  }
  const hmac = Crypto.createHmac("sha1", config.key);
  hmac.update(splitUrl);
  const hmacUrl = hmac.digest("hex");
  const q = `${splitUrl}&c=${cid}&a=${hmacUrl.substring(0, 8)}`;
  return pre_q + q;
}
