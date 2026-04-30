import { handleBridgeRequest } from "./bridge-handler";
import { chromeStorageDriver, getState } from "../lib/storage";

chrome.runtime.onInstalled.addListener(() => {
  console.info("Shame The Web extension installed.");
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  void getState(chromeStorageDriver)
    .then((state) => {
      sendResponse(handleBridgeRequest(message, state));
    })
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown bridge error."
      });
    });

  return true;
});
