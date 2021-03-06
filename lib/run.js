import hippie from "hippie";
import config from "../config.dev.json";
import {
  yellow,
  bgYellow,
  blue,
  bgBlue,
  green,
  bgGreen,
  red,
  bgRed,
  white,
  whiteBright,
  bgWhite,
  black,
  bgBlack,
  bgBlackBright
} from "chalk";

const base =
  process && process.env && process.env.BASE ? process.env.BASE : config.base;
const key =
  process && process.env && process.env.KEY ? process.env.KEY : config.key;
const verbose =
  process && process.env && process.env.VERBOSE ? !!process.env.VERBOSE : false;

if (!key) {
  throw "No key provided for API";
}

export function start(apiKeyName, startBase = base, multiPart = false, json = true) {
    if (!startBase) {
        startBase = base;
    }
    return getHippieInstance(startBase, apiKeyName, multiPart, json);
}

function getHippieInstance(base, apiKeyName, multiPart = false, json = true) {
  return json ? hippie()
    .json()
    .use((...args) => addHeader(...args, apiKeyName, multiPart))
    .use(preview)
    .base(base)
    .time(true)
    :
    hippie()
    .use((...args) => addHeader(...args, apiKeyName, multiPart))
    .use(preview)
    .base(base)
    .time(true);
}

function addHeader(options, next, apiKeyName, multiPart) {
  options.headers["User-Agent"] = "media-library-end-to-end";
  options.headers["Client-Access-Token"] = `${
    apiKeyName && config.keys && config.keys[apiKeyName]
      ? config.keys[apiKeyName]
      : key
  }`;
  options.headers["X-Requesting-For"] = apiKeyName;
  options.headers.Accept = "application/json,binary,text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,image/gif";
  options.headers["Accept-Encoding"] = "gzip, deflate, br";
  if(multiPart) {
      options.headers['Content-Type'] = 'multipart/form-data';
  }
  next(options);
}

export function report(message, extras = "") {
  const { request } = message;
  console.log(
    `${logMethod(request.method)} ${logUrl(request.uri.href)} took ${
      request.elapsedTime
    }ms ${extras}`
  );
  return message;
}
export function preview(options, next) {
  if (verbose) {
    console.log(
      `${logMethod(options.method)} ${logUrl(options.url, true)} for ${
        options.headers["X-Requesting-For"]
      }`
    );
  }
  next(options);
}
export function reportErrors(err, shouldThrow = true) {
  // console.log(`${request.method} ${domain}${request.path}: ${request.elapsedTime}`);
  if (err && shouldThrow) {
    throw err;
  } else if (err) {
    console.error(bgRed(white(err)));
  }
}
export function logErrors(err) {
  return reportErrors(err, false);
}

export function promiseTimeout(timeout = 500) {
  console.log(bgBlue(white(`Timeout set for ${timeout} ms`)));
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

function logMethod(method) {
  const strMethod = ` ${method} `.padStart(10);
  switch (method) {
    case "GET":
      return bgGreen(white(strMethod));
    case "PUT":
      return bgGreen(yellow(strMethod));
    default:
      return bgGreen(yellow(strMethod));
  }
}

function logUrl(url, starting) {
  return (starting ? bgYellow : bgBlackBright)(
    " " + whiteBright(url.substr(0, 120).padStart(120)) + " "
  );
}

export function suite(title) {
  console.log(bgBlue(whiteBright(` Test Suite ${title}`.padEnd(133) + `\n`)));
}

export retry from "./retry";
