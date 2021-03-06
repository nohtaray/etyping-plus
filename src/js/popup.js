import '../css/popup.css';

window.onload = () => {
  const q = (...args) => document.querySelector(...args);
  const CONFIG_SHOW_LATENCY_BALLOON = 'config.showLatencyBalloon';
  const CONFIG_LATENCY_TARGET_1 = 'config.latencyTarget1';
  const CONFIG_LATENCY_TARGET_2 = 'config.latencyTarget2';

  const sendConfigToActiveTab = () => {
    // FIXME: エタイのタブがアクティブじゃないときに更新されると、ゲームのモーダルを開き直すまで反映されない
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, ['updateConfig', Object.assign({}, localStorage)]);
    });
  };

  // デフォルト値設定
  if (localStorage.getItem(CONFIG_SHOW_LATENCY_BALLOON) == null) localStorage.setItem(CONFIG_SHOW_LATENCY_BALLOON, '');
  if (localStorage.getItem(CONFIG_LATENCY_TARGET_1) == null) localStorage.setItem(CONFIG_LATENCY_TARGET_1, '0.400');
  if (localStorage.getItem(CONFIG_LATENCY_TARGET_2) == null) localStorage.setItem(CONFIG_LATENCY_TARGET_2, '0.500');

  q('#show-latency-balloon').checked = !!localStorage.getItem(CONFIG_SHOW_LATENCY_BALLOON);
  q('#latency-target1').value = localStorage.getItem(CONFIG_LATENCY_TARGET_1);
  q('#latency-target2').value = localStorage.getItem(CONFIG_LATENCY_TARGET_2);
  q('#latency-target1').disabled = !q('#show-latency-balloon').checked;
  q('#latency-target2').disabled = !q('#show-latency-balloon').checked;

  q('#show-latency-balloon').addEventListener('change', function() {
    localStorage.setItem(CONFIG_SHOW_LATENCY_BALLOON, this.checked ? '1' : '');
    q('#latency-target1').disabled = !this.checked;
    q('#latency-target2').disabled = !this.checked;
    sendConfigToActiveTab();
  }, false);
  q('#latency-target1').addEventListener('keyup', function() {
    localStorage.setItem(CONFIG_LATENCY_TARGET_1, this.value);
    sendConfigToActiveTab();
  }, false);
  q('#latency-target2').addEventListener('keyup', function() {
    localStorage.setItem(CONFIG_LATENCY_TARGET_2, this.value);
    sendConfigToActiveTab();
  }, false);
};
