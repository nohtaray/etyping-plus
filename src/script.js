const handleLoadApp = () => {
  console.log('etyping-better-result: enabled');

  const ADD_ROWS = 1;
  const ADD_HEIGHT = 32 * ADD_ROWS;

  const $ = jQuery;
  let latencies = [];
  let st;
  let previousResult = {};
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
    const latenciesSum = latencies.map(a => +a).reduce((a, b) => a + b, 0);
    const latency = latenciesSum / latencies.length / 1000;
    $('#current .result_data ul').append(`<li id="latency"><div class="title">1文字目</div><div class="data">${latency.toFixed(3)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_latency"><div class="data">${previousResult.latency == null ? '-' : previousResult.latency.toFixed(3)}</div></li>`);

    // 1文字目除いた WPM
    const timeStr = $('#current .result_data ul .title:contains("入力時間")').next().text();
    const time = timeStr.replace('秒', '.') * 1000;
    const charCount = +$('#current .result_data ul .title:contains("入力文字数")').next().text();
    const rkpm = (charCount - latencies.length) / (time - latenciesSum) * 60000;
    $('#current .result_data ul').append(`<li id="rkpm"><div class="title">RKPM</div><div class="data">${rkpm.toFixed(2)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_rkpm"><div class="data">${previousResult.rkpm == null ? '-' : previousResult.rkpm.toFixed(2)}</div></li>`);

    latencies = [];
    previousResult = { latency, rkpm };

    // 見た目調整
    $('#result article').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #exampleList').css('height', `+=${ADD_HEIGHT}px`);
    $('#result .result_data').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #current').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #prev').css('height', `+=${ADD_HEIGHT}px`);
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

  // 見た目調整
  $('#app').css('height', `+=${ADD_HEIGHT}px`);
};

// タイピング画面出てたら script を注入する
setInterval(() => {
  const appIframe = document.querySelector('iframe[src*="app/standard.asp"]');
  const scriptId = '__etyping-better-result-script';
  if (!appIframe) return;
  // src は app/standard.asp だけど一度リダイレクトされる
  if (!appIframe.contentWindow.location.pathname.match(/\/app\/jsa_(std|kana)\/typing\.asp/g)) return;
  if (!appIframe.contentDocument.body) return;
  if (appIframe.contentDocument.getElementById(scriptId)) return;

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.id = scriptId;
  script.textContent = `( ${handleLoadApp.toString()} )()`;
  appIframe.contentDocument.body.appendChild(script);

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