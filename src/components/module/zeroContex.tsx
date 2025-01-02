import { createContext, ParentProps, useContext } from "solid-js";
import { createZero } from "@rocicorp/zero/solid";
import { decodeJwt } from "jose";
import { type Schema, schema } from "~/../db/clientDB/schema";
import { Zero } from "@rocicorp/zero";
import Cookies from "js-cookie";

const ZeroContext = createContext<Zero<Schema>>(createZeroInstance());
// console.log("createZeroInstance");

function createZeroInstance() {
  const encodedJWT = Cookies.get("jwt");
  // console.log("encodedJWT", encodedJWT);
  const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
  // console.log("decodedJWT", decodedJWT);
  const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";
  const z = createZero({
    userID,
    auth: () => encodedJWT,
    server: "http://localhost:4848",
    schema: schema,
    kvStore: "mem",
  });

  return z;
}

export function ZeroProvider(props: ParentProps) {
  const z = createZeroInstance();
  return (
    <ZeroContext.Provider value={z}>{props.children}</ZeroContext.Provider>
  );
}

export function useZero() {
  return useContext(ZeroContext);
}
