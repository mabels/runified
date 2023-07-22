import { ApiHandler } from "../../types/app/api_handler";

export function SetConnectionClose(api: ApiHandler): Promise<boolean> {
  const connection = api.Request().Header.Get("X-Connection");
  if (connection) {
    api.Response().Header().Set("Connection", connection);
  }
  return Promise.resolve(true);
}
