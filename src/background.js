chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // popup で設定した localStorage は Content Script から参照できない
  if (Array.isArray(request) && request[0] === 'localStorage') {
    const [_, method, ...args] = request;
    if (method === 'getAllItems') {
      sendResponse(Object.assign({}, localStorage));
    } else {
      sendResponse(localStorage[method](...args));
    }
  }
});