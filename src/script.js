const handleLoadApp = () => {
  console.log('٩( ๑╹ ꇴ╹)۶');

  const ADD_ROWS = 1;
  const ADD_HEIGHT = 32 * ADD_ROWS;

  const $ = jQuery;
  let latencies = [];
  let misses = [];
  let times = [];
  let finishedCount = 0;
  let wordStartTime;
  let wordMiss = 0;
  let previousResult = {};
  const handleShowWord = () => {
    wordStartTime = Date.now();
    wordMiss = 0;
  };
  const handleFinishWord = () => {
    const wordTime = Date.now() - wordStartTime;
    times.push(wordTime);
    misses.push(wordMiss);
    finishedCount += 1;
  };
  const handleAcceptFirstKey = () => {
    const latency = Date.now() - wordStartTime;
    latencies.push(latency);
  };
  const handleAccept = () => {
  };
  const handleMiss = () => {
    wordMiss += 1;
  };
  const handleEscape = () => {
    const time = Date.now() - wordStartTime;
    times.push(time);
    misses.push(wordMiss);
  };
  const handleShowResult = () => {
    // ワード詳細
    for (let i = 0; i < finishedCount; i++) {
      const wordLength = $('#exampleList li .sentence').eq(i).text().trim().length;
      const kpm = wordLength / times[i] * 60000;
      const rkpm = (wordLength - 1) / (times[i] - latencies[i]) * 60000;
      $('#exampleList li').eq(i).append($('<div>').css({
        'font-size': '12px',
        'position': 'relative',
        'top': '-2px',
      }).text(`latency: ${(latencies[i] / 1000).toFixed(3)}, kpm: ${kpm.toFixed(0)}, rkpm: ${rkpm.toFixed(0)}, miss: ${misses[i].toFixed(0)}`));
    }

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

    misses = [];
    times = [];
    latencies = [];
    finishedCount = 0;
    previousResult = { latency, rkpm };

    // 見た目調整
    $('#result article').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #exampleList').css('height', `+=${ADD_HEIGHT}px`);
    $('#result .result_data').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #current').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #prev').css('height', `+=${ADD_HEIGHT}px`);
  };

  const handleLoadStartView = () => {
    // タイピング終了時に毎回削除されるので毎回設定する
    // これらのイベント発火時にはまだ画面書き換わってないので気をつける
    let waitingAcceptedFirstKey = false;
    $(document).on('end_countdown.etyping change_complete.etyping', () => {
      handleShowWord();
      waitingAcceptedFirstKey = true;
    });
    $(document).on('correct.etyping', () => {
      if (waitingAcceptedFirstKey) {
        handleAcceptFirstKey();
        waitingAcceptedFirstKey = false;
      }
      handleAccept();
    });
    $(document).on('error.etyping', () => {
      handleMiss();
    });
    $(document).on('change_example.etyping complete.etyping', () => {
      handleAccept();
      handleFinishWord();
    });
    $(document).on('interrupt.etyping', () => {
      handleEscape();
    });
  };

  let startViewIsShowed = false;
  // イベントハンドラで画面書き換えた後にミスって例外吐くと無限ループになるのであんまりここに処理書きたくない
  const handleChangeNode = () => {
    if ($('#start_msg').size() + $('#countdown').size() > 0 && !startViewIsShowed) {
      handleLoadStartView();
    }
    startViewIsShowed = $('#start_msg').size() + $('#countdown').size() > 0;

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