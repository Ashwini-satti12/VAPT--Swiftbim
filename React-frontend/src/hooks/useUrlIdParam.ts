import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { parseUrlId } from "../utils/urlIdCrypto";

/** Read and decode a numeric route param (e.g. :id, :resourceId). */
export function useUrlIdParam(paramName: string): number | null {
  const params = useParams();
  const raw = params[paramName];
  return useMemo(() => parseUrlId(raw), [raw]);
}
