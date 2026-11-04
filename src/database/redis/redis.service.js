import { client } from "../../main.js";

export const get = (key) => {
  return client.get(key);
};

export const set = (key, value, Ex) => {
  return client.set(key, value, { EX: Ex });
};

export const del = (key) => {
  return client.del(key);
};

export const exists = (key) => {
  return client.exists(key);
};

export const expire = (key, seconds) => {
  return client.expire(key, seconds);
};

export const ttl = (key) => {
  return client.ttl(key);
};
export const incr = (key) => {
  return client.incr(key);
};
