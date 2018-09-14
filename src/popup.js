window.onload = () => {
  const q = (...args) => document.querySelector(...args);
  const CONFIG_SHOW_LATENCY_BALLOON = 'config.showLatencyBalloon';
  const CONFIG_LATENCY_TARGET_1 = 'config.latencyTarget1';
  const CONFIG_LATENCY_TARGET_2 = 'config.latencyTarget2';

  q('#show-latency-balloon').checked = !!localStorage.getItem(CONFIG_SHOW_LATENCY_BALLOON);
  q('#latency-target1').value = localStorage.getItem(CONFIG_LATENCY_TARGET_1) || '400';
  q('#latency-target2').value = localStorage.getItem(CONFIG_LATENCY_TARGET_2) || '500';
  q('#latency-target1').disabled = !q('#show-latency-balloon').checked;
  q('#latency-target2').disabled = !q('#show-latency-balloon').checked;

  q('#show-latency-balloon').addEventListener('change', function() {
    localStorage.setItem(CONFIG_SHOW_LATENCY_BALLOON, this.checked ? '1' : '');
    q('#latency-target1').disabled = !this.checked;
    q('#latency-target2').disabled = !this.checked;
  }, false);
  q('#latency-target1').addEventListener('change', function() {
    localStorage.setItem(CONFIG_LATENCY_TARGET_1, this.value);
  }, false);
  q('#latency-target2').addEventListener('change', function() {
    localStorage.setItem(CONFIG_LATENCY_TARGET_2, this.value);
  }, false);
};
