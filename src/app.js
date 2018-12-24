// リザルトを全画面表示したときに注入される
const initializeExpandedResult = () => {
  // 同じ id で複数存在すると困るのでクラスで扱う
  $('#exampleList').addClass('exampleList');

  // ワードが少ないときは1列でいい
  const wordCount = $('.exampleList').eq(0).find('li').size();
  if (wordCount >= 5) {
    $('.exampleList').eq(0).clone().insertAfter($('#exampleList').eq(0));
    for (let i = wordCount - 1; i >= 0; i--) {
      if (i < wordCount / 2) {
        $('.exampleList').eq(1).find('li').eq(i).remove();
      } else {
        $('.exampleList').eq(0).find('li').eq(i).remove();
      }
    }
  }

  // 列の中身が全部表示されるようにしつつ高さを揃える
  const adjustHeight = () => {
    $('.exampleList').css('height', 'auto');
    const height1 = parseInt($('.exampleList').eq(0).css('height') || 0, 10);
    const height2 = parseInt($('.exampleList').eq(1).css('height') || 0, 10);
    const minResultDataHeight = 318 - 34;
    const maxHeight = Math.max(height1, height2, minResultDataHeight);
    $('.exampleList').css('height', `${maxHeight}px`);

    $('#current,#prev').css('height', `${maxHeight + 83}px`);
    $('.result_data').css('height', `${maxHeight + 34}px`);
  };

  // 見た目調整
  $('#comment').remove();
  $('#btn_area').remove();
  $('.expand_result').remove();
  $('body').css('overflow', 'scroll');
  $('#result').css('margin', '12px');
  if ($('.exampleList').size() === 2) {
    $('.exampleList').eq(1).css('left', '387px');
    $('#current').css('width', '964px');
    $('#result>article').css('width', '1104px');
  }
  adjustHeight();
  $(window).on('resize', () => adjustHeight());
};

// タイピング画面に注入される
jQuery(function($) {
  console.log('٩( ๑╹ ꇴ╹)۶');

  const ADD_ROWS = 1;
  const ADD_HEIGHT = 32 * ADD_ROWS;

  {
    // 打鍵直後の初速表示が有効なときはランキング送信を失敗させる
    const $originalAjax = $.ajax;
    $.ajax = (options, ...args) => {
      if (shouldShowLatencyBalloon && typeof options.url === 'string' && options.url.endsWith('set_ranking.asp')) {
        return $.Deferred().reject().promise();
      }
      return $originalAjax(options, ...args);
    };
  }

  const showLatencyBalloon = (latency, target1, target2) => {
    const color = latency < target1 ? '#dff0d8' : latency < target2 ? '#fcf8e3' : '#f2dede';
    $('#sentenceText .entered').next().showBalloon({
      contents: (latency / 1000).toFixed(3), classname: 'balloon', position: 'bottom left', offsetY: -4, offsetX: 50, tipSize: 0, showDuration: 64,
      showAnimation: function(d, c) { this.fadeIn(d, c); },
      css: {
        backgroundColor: color,
        color: '#636363',
        boxShadow: '1px 1px 1px #555',
      },
    });
  };
  const hideLatencyBalloon = () => {
    $('.balloon').remove();
  };

  const killException = function(f) {
    return function(...args) {
      try {
        return f.call(this, ...args);
      } catch (e) {
        console.error(e);
      }
    };
  };

  const expandResult = () => {
    // 新しいウィンドウに #app をコピーして CSS 読み込み
    // 'about:blank' を指定しないとリサイズができない https://stackoverflow.com/questions/35341839/chrome-zoom-is-not-working-in-child-tab
    const newDoc = window.open('about:blank').document;
    newDoc.write($('#app').html());
    Array.from($('head>link[rel="stylesheet"]'), style => newDoc.write(style.outerHTML));
    // TODO: src/ の中から読む
    newDoc.write('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>');
    newDoc.write($('<script>').text(`( ${initializeExpandedResult.toString()} )()`).get(0).outerHTML);
  };

  let shouldShowLatencyBalloon;
  let latencyTarget1;
  let latencyTarget2;
  let latencies = [];
  let misses = [];
  let times = [];
  let charTimes = [];
  let missTimes = [];
  let finishedCount = 0;
  let wordStartTime;
  let charStartTime;
  let wordMiss = 0;
  let wordCharTimes = [];
  let wordMissTimes = [];
  let charMissTimes = [];
  let previousResult = {};
  const handleShowWord = () => {
    wordStartTime = charStartTime = Date.now();
    wordMiss = 0;
    wordCharTimes = [];
    wordMissTimes = [];
    charMissTimes = [];
  };
  const handleFinishWord = () => {
    const wordTime = Date.now() - wordStartTime;
    times.push(wordTime);
    misses.push(wordMiss);
    charTimes.push(wordCharTimes);
    missTimes.push(wordMissTimes);
    finishedCount += 1;

    hideLatencyBalloon();
  };

  const handleAcceptFirstKey = () => {
    const latency = Date.now() - wordStartTime;
    latencies.push(latency);

    if (shouldShowLatencyBalloon) {
      showLatencyBalloon(latency, latencyTarget1, latencyTarget2);
    }
  };
  const handleAccept = () => {
    const time = Date.now() - charStartTime;
    wordCharTimes.push(time);
    wordMissTimes.push(charMissTimes);
    charStartTime += time;
    charMissTimes = [];
  };
  const handleMiss = () => {
    const time = Date.now() - charStartTime;
    charMissTimes.push(time);
    wordMiss += 1;
  };
  const handleEscape = () => {
    const time = Date.now() - wordStartTime;
    times.push(time);
    misses.push(wordMiss);
    wordMissTimes.push(charMissTimes);
    charTimes.push(wordCharTimes);
    missTimes.push(wordMissTimes);

    hideLatencyBalloon();
  };
  const handleShowResult = () => {
    // TODO: 消す
    console.log({ misses, times, latencies, finishedCount });
    console.log({ charTimes, missTimes });

    // ワード詳細
    const $sentences = $('#exampleList li .sentence').css('cursor', 'default');
    // TODO: ワードの途中で Esc しても詳細を表示したい
    for (let i = 0; i < finishedCount; i++) {
      // 文字別タイム
      const keys = $sentences.eq(i).text().trim().split('');
      const $keys = keys.map((k, j) => {
        const $key = $('<span>').text(k);
        const loss = Math.max(...missTimes[i][j], 0);
        if (loss > 0) {
          return $key.attr('title', `${(charTimes[i][j] / 1000).toFixed(3)} (${(loss / 1000).toFixed(3)})`).addClass('miss');
        } else {
          return $key.attr('title', `${(charTimes[i][j] / 1000).toFixed(3)}`);
        }
      });
      $sentences.eq(i).html($keys);

      // ワード別詳細
      const wordLength = keys.length;
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
    $('#current .result_data ul').append(`<li id="latency"><div class="title">Latency</div><div class="data">${latency.toFixed(3)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_latency"><div class="data">${previousResult.latency == null ? '-' : previousResult.latency.toFixed(3)}</div></li>`);

    const parseTime = timeStr => {
      if (timeStr.includes('分')) {
        const [m, s] = timeStr.split('分');
        return m * 60000 + s.replace('秒', '.') * 1000;
      }
      return timeStr.replace('秒', '.') * 1000;
    };
    const time = parseTime($('#current .result_data ul .title:contains("入力時間")').next().text());
    const charCount = +$('#current .result_data ul .title:contains("入力文字数")').next().text();
    const rkpm = (charCount - latencies.length) / (time - latenciesSum) * 60000;
    $('#current .result_data ul').append(`<li id="rkpm"><div class="title">RKPM</div><div class="data">${rkpm.toFixed(2)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_rkpm"><div class="data">${previousResult.rkpm == null ? '-' : previousResult.rkpm.toFixed(2)}</div></li>`);

    misses = [];
    times = [];
    charTimes = [];
    missTimes = [];
    latencies = [];
    finishedCount = 0;
    previousResult = { latency, rkpm };

    // 見た目調整
    $('#result article').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #exampleList').css('height', `+=${ADD_HEIGHT}px`);
    $('#result .result_data').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #current').css('height', `+=${ADD_HEIGHT}px`);
    $('#result #prev').css('height', `+=${ADD_HEIGHT}px`);
    // マウスで選択できるようにする
    $('#result').css({ 'user-select': 'text' });
    // 全画面表示ボタン
    $('<i class="fas fa-external-link-alt">').addClass('expand_result').appendTo($('#current')).on('click', () => {
      expandResult();
    }).css({
      'position': 'absolute',
      'padding': '8px',
      'top': '3px',
      'right': '5px',
      'font-size': '14px',
      'color': '#636363',
    }).hover(
        function() { $(this).css('cursor', 'pointer'); },
        function() { $(this).css('cursor', 'default'); },
    );
  };

  const setResultShortcutKeysIfNotYet = () => {
    const eventNamespace = 'etypingbetterresult';
    const isSet = ($._data(document).events.keydown || []).some(e => {
      return e.namespace === eventNamespace;
    });
    if (isSet) return;

    $(document).on(`keydown.${eventNamespace}`, e => {
      // F (Full result)
      if (e.keyCode === 70) {
        expandResult();
      }
    });
  };

  const updateConfig = () => {
    const configDiv = $('#config').get(0);
    shouldShowLatencyBalloon = !!configDiv.dataset.showLatencyBalloon;
    latencyTarget1 = parseFloat(configDiv.dataset.latencyTarget1) * 1000;
    latencyTarget2 = parseFloat(configDiv.dataset.latencyTarget2) * 1000;
  };

  const handleLoadStartView = () => {
    updateConfig();

    // タイピング終了時に毎回削除されるので毎回設定する
    // jQuery#on で設定した関数内で例外が発生すると後続の関数も実行されなくなるので例外は潰す
    let waitingAcceptedFirstKey = false;
    $(document).on('start_countdown.etyping', killException(() => {
      updateConfig();
    }));
    $(document).on('end_countdown.etyping change_complete.etyping', killException(() => {
      handleShowWord();
      waitingAcceptedFirstKey = true;
    }));
    $(document).on('correct.etyping change_example.etyping complete.etyping', killException(() => {
      if (waitingAcceptedFirstKey) {
        handleAcceptFirstKey();
        waitingAcceptedFirstKey = false;
      }
      handleAccept();
    }));
    $(document).on('error.etyping', killException(() => {
      handleMiss();
    }));
    $(document).on('change_example.etyping complete.etyping', killException(() => {
      handleFinishWord();
    }));
    $(document).on('interrupt.etyping', killException(() => {
      handleEscape();
    }));
  };

  let startViewIsShowed = false;
  let resultViewIsShowed = false;
  // イベントハンドラで画面書き換えた後にミスって例外吐くと無限ループになりかねないのであんまりここに処理書きたくない
  const handleChangeNode = () => {
    if (!startViewIsShowed && $('#start_msg').size() + $('#countdown').size() > 0) {
      startViewIsShowed = true;
      handleLoadStartView();
    }
    startViewIsShowed = $('#start_msg').size() + $('#countdown').size() > 0;

    // リザルト出た
    if (!resultViewIsShowed && $('#current .result_data').size() > 0) {
      resultViewIsShowed = true;
      handleShowResult();
    }
    resultViewIsShowed = $('#current .result_data').size() > 0;
    if (resultViewIsShowed && $('#overlay.on').size() === 0) {
      // ランキングのモーダル出したりすると消されちゃうので必要に応じて再セットする
      setResultShortcutKeysIfNotYet();
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
});