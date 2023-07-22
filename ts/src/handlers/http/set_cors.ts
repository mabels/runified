import { ApiHandler } from "../../types/app/api_handler";

export function SetCorsHeader(api: ApiHandler): Promise<boolean> {
  api.Response().Header().Set("Access-Control-Allow-Origin", "*");
  return Promise.resolve(true);
}
