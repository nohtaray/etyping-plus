const handleLoadApp = () => {
  console.log('etyping-better-result: enabled');

  const $ = jQuery;
  let latencies = [];
  let st;
  const handleShowWord = () => {
    st = Date.now();
  };
  const handleAcceptFirstKey = () => {
    const lt = Date.now() - st;
    latencies.push(lt);
  };
  const handleShowResult = () => {
    // 苦手キー邪魔なので除去
    $('#current .result_data ul li').last().remove();
    $('#prev .result_data ul li').last().remove();

    // 初速
    const sum = latencies.map(a => +a).reduce((a, b) => a + b, 0);
    const mean = sum / latencies.length / 1000;
    $('#current .result_data ul').append(`<li id="latency"><div class="title">1文字目</div><div class="data">${mean.toFixed(3)}</div></li>`);

    // 1文字目除いた WPM
    const timeStr = $('#current .result_data ul .title:contains("入力時間")').next().text();
    const time = timeStr.replace('秒', '.') * 1000;
    const charCount = +$('#current .result_data ul .title:contains("入力文字数")').next().text();
    const wpm2 = (charCount - latencies.length) / (time - sum) * 60000;
    $('#current .result_data ul').append(`<li id="wpm2"><div class="title">WPM2</div><div class="data">${wpm2.toFixed(2)}</div></li>`);

    latencies = [];
  };

  let prevText;
  let prevEntered;
  const handleChangeNode = () => {
    const text = $('#exampleText').text();
    const entered = $('#sentenceText .entered').text();
    if (text !== '' && prevText === '') {
      // ワード出現
      handleShowWord();
    } else if (prevEntered === '' && entered !== '') {
      // 1文字目打った
      handleAcceptFirstKey();
    }
    prevText = text;
    prevEntered = entered;

    // リザルト出た
    if ($('#current .result_data').size() > 0 && $('#latency').size() === 0) {
      handleShowResult();
    }
  };

  const observer = new MutationObserver((...args) => {
    handleChangeNode(args);
  });
  observer.observe(document.querySelector('#app'), {
    childList: true,
    subtree: true,
  });
};

// タイピング画面出てたら script を注入する
setInterval(() => {
  const appIframe = document.querySelector('iframe[src*="app/standard.asp"]');
  const scriptId = '__etyping-better-result-script';
  if (!appIframe) return;
  // src は app/standard.asp だけど一度リダイレクトされる
  if (appIframe.contentWindow.location.pathname !== '/app/jsa_std/typing.asp') return;
  if (!appIframe.contentDocument.body) return;
  if (appIframe.contentDocument.getElementById(scriptId)) return;

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.id = scriptId;
  script.textContent = `( ${handleLoadApp.toString()} )()`;
  appIframe.contentDocument.body.appendChild(script);
}, 1000);