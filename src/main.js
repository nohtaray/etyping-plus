const getConfig = callback => {
  // -> background.js
  chrome.runtime.sendMessage(['localStorage', 'getAllItems'], items => {
    callback.call(null, items);
  });
};

// タイピング画面の iframe 要素を取得
const getAppIframe = () => {
  const appIframe = document.querySelector('iframe[src*="app/standard.asp"]');
  if (!appIframe) return;
  // src は app/standard.asp だけど一度リダイレクトされる
  if (!appIframe.contentWindow.location.pathname.match(/\/app\/jsa_(std|kana)\/typing\.asp/g)) return;
  if (!appIframe.contentDocument.body) return;

  return appIframe;
};

const updateConfigDiv = (configDiv, config) => {
  configDiv.dataset.showLatencyBalloon = config['config.showLatencyBalloon'] || '';
  configDiv.dataset.latencyTarget1 = config['config.latencyTarget1'] || 0;
  configDiv.dataset.latencyTarget2 = config['config.latencyTarget2'] || 0;
};

// タイピング画面出てたら script を注入する
setInterval(() => {
  const appIframe = getAppIframe();
  if (!appIframe) return;
  if (appIframe.contentDocument.getElementsByClassName(chrome.runtime.id).length > 0) return;

  ['src/app.js', 'src/jquery.balloon.min.js'].forEach(fileName => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.className = chrome.runtime.id;
    script.src = chrome.runtime.getURL(fileName);
    script.async = true;
    appIframe.contentDocument.body.appendChild(script);
  });

  ['fontawesome/css/fontawesome.min.css', 'fontawesome/css/solid.min.css'].forEach(fileName => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(fileName);
    appIframe.contentDocument.body.appendChild(link);
  });

  const configDiv = document.createElement('div');
  configDiv.id = 'config';
  configDiv.style.display = 'none';
  appIframe.contentDocument.body.appendChild(configDiv);
  getConfig(config => {
    updateConfigDiv(configDiv, config);
  });

  // 見た目調整
  const ADD_ROWS = 1;
  const ADD_HEIGHT = 32 * ADD_ROWS;
  const addHeight = (element, height) => {
    element.style.height = parseInt(element.style.height, 10) + height + 'px';
  };
  addHeight(document.querySelector('.pp_content'), ADD_HEIGHT);
  addHeight(document.querySelector('.pp_hoverContainer'), ADD_HEIGHT);
  appIframe.height = parseInt(appIframe.height, 10) + ADD_HEIGHT;
}, 1000);

// 設定が変更されたら反映する
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (Array.isArray(request) && request[0] === 'updateConfig') {
    const config = request[1];
    const appIframe = getAppIframe();
    if (!appIframe) return;

    const configDiv = appIframe.contentDocument.getElementById('config');
    updateConfigDiv(configDiv, config);
  }
});