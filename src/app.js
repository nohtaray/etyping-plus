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

  // 文字別タイム表示
  // FIXME: 共通化
  $('#exampleList li .sentence span[data-tooltip]').each((_, e) => {
    $(e).balloon({
      classname: 'time-balloon',
      contents: $(e).data('tooltip'),
      showDuration: 64,
      minLifetime: 0,
      tipSize: 4,
      showAnimation(d, c) { this.fadeIn(d, c); },
      css: {
        backgroundColor: '#f7f7f7',
        color: '#636363',
        boxShadow: '0',
        opacity: 1,
      },
    });
  });
};

const expandResult = () => {
  // 新しいウィンドウに #app をコピーして CSS 読み込み
  // 'about:blank' を指定しないとリサイズができない https://stackoverflow.com/questions/35341839/chrome-zoom-is-not-working-in-child-tab
  const newDoc = window.open('about:blank').document;
  newDoc.write($('#app').html());
  Array.from($('head>link[rel="stylesheet"]'), style => newDoc.write(style.outerHTML));
  // TODO: src/ の中から読む
  newDoc.write('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>');
  const balloonJsSrc = Array.from(document.scripts, s => s.src).filter(s => s.includes('jquery.balloon'))[0];
  newDoc.write(`<script type="text/javascript" src="${balloonJsSrc}"></script>`);
  newDoc.write($('<script>').text(`( ${initializeExpandedResult.toString()} )()`).get(0).outerHTML);
};

const ADD_ROWS = 1;
const ADD_HEIGHT = 32 * ADD_ROWS;

// ---- リザルト拡張まわり ----
function showWordDetail(charTimes, $sentence, missTimes, time, latency, miss) {
  if (charTimes == null || charTimes.length === 0) {
    $sentence.fadeTo(0, 0.6);
    return;
  }

  // 文字別タイム
  const keys = $sentence.text().trim().split('');
  const $keys = keys.map((k, j) => {
    const $key = $('<span>').text(k);
    if (missTimes[j] == null) return $key.fadeTo(0, 0.6);

    const loss = Math.max(...missTimes[j], -Infinity);
    if (loss >= 0) {
      $key.addClass('miss');
    }
    if (charTimes[j] == null) return $key.fadeTo(0, 0.6);

    const toolTip = loss >= 0
        ? `${(charTimes[j] / 1000).toFixed(3)} (${(loss / 1000).toFixed(3)})`
        : `${(charTimes[j] / 1000).toFixed(3)}`;
    // FIXME: 共通化。全画面の方コピペで定義してるので変えるときは一緒に変えてください
    return $key.attr('data-tooltip', toolTip).balloon({
      classname: 'time-balloon',
      contents: toolTip,
      showDuration: 64,
      minLifetime: 0,
      tipSize: 4,
      showAnimation(d, c) { this.fadeIn(d, c); },
      css: {
        backgroundColor: '#f7f7f7',
        color: '#636363',
        boxShadow: '0',
        opacity: 1,
      },
    });
  });
  $sentence.html($keys);

  // ワード別詳細
  const wordLength = charTimes.length;
  const kpm = wordLength / time * 60000;
  const rkpm = (wordLength - 1) / (time - latency) * 60000;
  $sentence.parent().append($('<div>').css({
    'font-size': '12px',
    position: 'relative',
    top: '-2px',
  }).text(`latency: ${(latency / 1000).toFixed(3)}, kpm: ${kpm.toFixed(0)}, rkpm: ${rkpm.toFixed(0)}, miss: ${miss.toFixed(0)}`));
}

function extendResult({ misses, times, latencies, charTimes, missTimes, previousResult, expandResult, rkpm, latency }) {
  // ワード詳細
  const $sentences = $('#exampleList li .sentence').css('cursor', 'default');
  for (let i = 0; i < $sentences.size(); i++) {
    showWordDetail(charTimes[i], $sentences.eq(i), missTimes[i], times[i], latencies[i], misses[i]);
  }

  // 苦手キー邪魔なので除去
  $('#current .result_data ul li').last().remove();
  $('#prev .result_data ul li').last().remove();

  // 初速
  $('#current .result_data ul').append(`<li id="latency"><div class="title">Latency</div><div class="data">${latency.toFixed(3)}</div></li>`);
  $('#prev .result_data ul').append(`<li id="previous_latency"><div class="data">${previousResult.latency == null ? '-' : previousResult.latency.toFixed(3)}</div></li>`);

  // RKPM
  $('#current .result_data ul').append(`<li id="rkpm"><div class="title">RKPM</div><div class="data">${rkpm.toFixed(2)}</div></li>`);
  $('#prev .result_data ul').append(`<li id="previous_rkpm"><div class="data">${previousResult.rkpm == null ? '-' : previousResult.rkpm.toFixed(2)}</div></li>`);

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
    position: 'absolute',
    padding: '8px',
    top: '3px',
    right: '5px',
    'font-size': '14px',
    color: '#636363',
  }).hover(
      function() { $(this).css('cursor', 'pointer'); },
      function() { $(this).css('cursor', 'default'); },
  );
}

// ---- ↑リザルト拡張まわり ----

// ---- 集計まわり ----

// TODO: クラス化
function Calculator() {
  let latencies = [];
  let misses = [];
  let times = [];
  let charTimes = [];
  let missTimes = [];
  let wordStartTime;
  let charStartTime;
  let wordMiss = 0;
  let wordCharTimes = [];
  let wordMissTimes = [];
  let charMissTimes = [];
  let previousResult = {};
  const handleShowWord = (now) => {
    wordStartTime = charStartTime = now;
    wordMiss = 0;
    wordCharTimes = [];
    wordMissTimes = [];
    charMissTimes = [];
  };
  const handleFinishWord = (now) => {
    const wordTime = now - wordStartTime;
    times.push(wordTime);
    misses.push(wordMiss);
    charTimes.push(wordCharTimes);
    missTimes.push(wordMissTimes);
  };

  const handleAcceptFirstKey = (now) => {
    const latency = now - wordStartTime;
    latencies.push(latency);
  };
  const handleAccept = (now) => {
    const time = now - charStartTime;
    wordCharTimes.push(time);
    wordMissTimes.push(charMissTimes);
    charStartTime += time;
    charMissTimes = [];
  };
  const handleMiss = (now) => {
    const time = now - charStartTime;
    charMissTimes.push(time);
    wordMiss += 1;
  };
  const handleEscape = (now) => {
    const time = now - wordStartTime;
    times.push(time);
    misses.push(wordMiss);
    wordMissTimes.push(charMissTimes);
    charTimes.push(wordCharTimes);
    missTimes.push(wordMissTimes);
  };
  const handleShowResult = () => {
    const resultMissCount = +$('#current .result_data ul .title:contains("ミス入力数")').next().text();
    if (misses.reduce((a, b) => a + b, 0) === resultMissCount - 1) {
      // 1足りない == LT 機能でミスって終わった
      const lastWordMissTimes = missTimes[missTimes.length - 1];
      lastWordMissTimes[lastWordMissTimes.length - 1].push(0);
      misses[misses.length - 1] += 1;
    }

    const parseTime = (timeStr) => {
      if (timeStr.includes('分')) {
        const [m, s] = timeStr.split('分');
        return m * 60000 + s.replace('秒', '.') * 1000;
      }
      return timeStr.replace('秒', '.') * 1000;
    };
    const latenciesSum = latencies.map(a => +a).reduce((a, b) => a + b, 0);
    const time = parseTime($('#current .result_data ul .title:contains("入力時間")').next().text());
    const charCount = +$('#current .result_data ul .title:contains("入力文字数")').next().text();
    const latency = latenciesSum / latencies.length / 1000;
    const rkpm = (charCount - latencies.length) / (time - latenciesSum) * 60000;
    // TODO: 外から呼び出す
    extendResult({
      misses, times, latencies, charTimes, missTimes, previousResult, expandResult, latency, rkpm,
    });

    previousResult = { latency, rkpm };
    misses = [];
    times = [];
    charTimes = [];
    missTimes = [];
    latencies = [];
  };
  return { handleShowWord, handleFinishWord, handleAcceptFirstKey, handleAccept, handleMiss, handleEscape, handleShowResult };
}

// ---- ↑集計まわり ----

function setEventHandlers({ $, onLoadStartView, onStartCountdown, onShowWord, onAccept, onMiss, onFinishWord, onEscape, onShowResult, resultShortCutKeys }) {
  const killException = function(f) {
    return function(...args) {
      try {
        return f.call(this, ...args);
      } catch (e) {
        console.error(e);
      }
    };
  };

  const setResultShortcutKeysIfNotYet = () => {
    const eventNamespace = 'etypingbetterresult';
    const isSet = ($._data(document).events.keydown || []).some(e => e.namespace === eventNamespace);
    if (isSet) return;

    $(document).on(`keydown.${eventNamespace}`, (e) => {
      if (e.keyCode in resultShortCutKeys) {
        resultShortCutKeys[e.keyCode]();
      }
    });
  };

  let startViewIsShowed = false;
  let resultViewIsShowed = false;
  // イベントハンドラで画面書き換えた後にミスって例外吐くと無限ループになりかねないのであんまりここに処理書きたくない
  const handleChangeNode = () => {
    if (!startViewIsShowed && $('#start_msg').size() + $('#countdown').size() > 0) {
      startViewIsShowed = true;
      onLoadStartView();
      // タイピング終了時に毎回削除されるので毎回設定する
      // jQuery#on で設定した関数内で例外が発生すると後続の関数も実行されなくなるので例外は潰す
      $(document).on('start_countdown.etyping', killException(() => {
        onStartCountdown();
      }));
      $(document).on('end_countdown.etyping change_complete.etyping', killException(() => {
        onShowWord();
      }));
      $(document).on('correct.etyping change_example.etyping complete.etyping', killException(() => {
        onAccept();
      }));
      $(document).on('error.etyping', killException(() => {
        onMiss();
      }));
      $(document).on('change_example.etyping complete.etyping', killException(() => {
        onFinishWord();
      }));
      $(document).on('interrupt.etyping', killException(() => {
        onEscape();
      }));
    }
    startViewIsShowed = $('#start_msg').size() + $('#countdown').size() > 0;

    // リザルト出た
    if (!resultViewIsShowed && $('#current .result_data').size() > 0) {
      resultViewIsShowed = true;
      onShowResult();
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
}

// タイピング画面に注入される
jQuery(($) => {
  console.log('٩( ๑╹ ꇴ╹)۶');

  let shouldShowLatencyBalloon;
  let latencyTarget1;
  let latencyTarget2;
  let waitingAcceptedFirstKey = false;
  let showWordTime;

  const calc = Calculator();

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

  const updateConfig = () => {
    const configDiv = $('#config').get(0);
    shouldShowLatencyBalloon = !!configDiv.dataset.showLatencyBalloon;
    latencyTarget1 = parseFloat(configDiv.dataset.latencyTarget1) * 1000;
    latencyTarget2 = parseFloat(configDiv.dataset.latencyTarget2) * 1000;
  };
  const showLatencyBalloon = (latency, target1, target2) => {
    const color = latency < target1 ? '#dff0d8' : latency < target2 ? '#fcf8e3' : '#f2dede';
    $('#sentenceText .entered').next().showBalloon({
      contents: (latency / 1000).toFixed(3),
      classname: 'balloon',
      position: 'bottom left',
      offsetY: -4,
      offsetX: 50,
      tipSize: 0,
      showDuration: 64,
      showAnimation(d, c) { this.fadeIn(d, c); },
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
  const removeTimeBalloons = () => {
    $('.time-balloon').remove();
  };

  setEventHandlers({
    $,
    onLoadStartView: () => {
      updateConfig();
      // リザルトで文字別タイムが表示されたまま R でリトライするとツールチップが残ったままになる
      removeTimeBalloons();
    },
    onStartCountdown: () => {
      updateConfig();
    },
    onShowWord: () => {
      showWordTime = Date.now();
      calc.handleShowWord(showWordTime);
      waitingAcceptedFirstKey = true;
    },
    onAccept: () => {
      const now = Date.now();
      if (waitingAcceptedFirstKey) {
        calc.handleAcceptFirstKey(now);
        if (shouldShowLatencyBalloon) {
          showLatencyBalloon(now - showWordTime, latencyTarget1, latencyTarget2);
        }
        waitingAcceptedFirstKey = false;
      }
      calc.handleAccept(now);
    },
    onMiss: () => {
      calc.handleMiss(Date.now());
    },
    onFinishWord: () => {
      calc.handleFinishWord(Date.now());
      hideLatencyBalloon();
    },
    onEscape: () => {
      calc.handleEscape(Date.now());
      hideLatencyBalloon();
    },
    onShowResult: () => {
      calc.handleShowResult();
    },
    resultShortCutKeys: {
      // F (Full result)
      70: () => {
        expandResult();
      },
    },
  });

  // 見た目調整
  $('#app').css('height', `+=${ADD_HEIGHT}px`);
});
