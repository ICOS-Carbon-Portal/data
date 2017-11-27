import 'whatwg-fetch';
import { getJson } from 'icos-cp-backend';
import config from '../../common/main/config';

const restheartBaseUrl = '//restheart.icos-cp.eu/';

export const getDownloadCounts = (filters, page = 1) => {
  const dataLevel = filters.dataLevel && filters.dataLevel.length ? filters.dataLevel : "0,1,2,3";
  const format = filters.format && filters.format.length ? filters.format.map(format => `"${format}"`) : "/.*/, null";
  const specification = filters.specification && filters.specification.length ? filters.specification.map(spec => `"${spec}"`) : "/.*/, null";
  const stations = filters.stations && filters.stations.length ? filters.stations.map(station => `"${station}"`) : "/.*/, null";
  const parameters = `page=${page}&avars={"specification":[${specification}],"format":[${format}],"dataLevel":[${dataLevel}],"stations":[${stations}]}`;

  return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getDownloadStats?${parameters}`);
}

export function getDataLevels() {
  return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getDataLevels?pagesize=100&page=1`);
}

export function getFormats() {
  return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getFormats?pagesize=100&page=1`);
}

export function getSpecifications() {
  return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getSpecifications?pagesize=100&page=1`);
}

export function getStations() {
  return getJson(`${restheartBaseUrl}db/dobjdls/_aggrs/getStations?pagesize=100&page=1`);
}
