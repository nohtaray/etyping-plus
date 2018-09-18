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

  // 見た目調整
  $('#comment').remove();
  $('#btn_area').remove();
  $('.expand_result').remove();
  $('body').css('overflow', 'scroll');
  $('#result').css('margin', '12px');
  $('#current,#prev,#result>article,.exampleList').css('height', 'auto');
  if ($('.exampleList').size() === 2) {
    $('.exampleList').eq(1).css('left', '387px');
    $('#current').css('width', '964px');
    $('#result>article').css('width', '1104px');
    $('.exampleList').eq(1).css('height', $('.exampleList').eq(0).css('height'));
  }
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
    newDoc.write('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>');
    newDoc.write($('<script>').text(`( ${initializeExpandedResult.toString()} )()`).get(0).outerHTML);
  };

  let shouldShowLatencyBalloon;
  let latencyTarget1;
  let latencyTarget2;
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
  };
  const handleMiss = () => {
    wordMiss += 1;
  };
  const handleEscape = () => {
    const time = Date.now() - wordStartTime;
    times.push(time);
    misses.push(wordMiss);

    hideLatencyBalloon();
  };
  const handleShowResult = () => {
    console.log({ misses, times, latencies, finishedCount });

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
    $('#current .result_data ul').append(`<li id="latency"><div class="title">Latency</div><div class="data">${latency.toFixed(3)}</div></li>`);
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
    // マウスで選択できるようにする
    $('#result').css({ 'user-select': 'text' });
    // 全画面表示ボタン
    $('<i class="fas fa-external-link-alt">').addClass('expand_result').appendTo($('#current')).on('click', () => {
      expandResult();
    }).css({
      'position': 'absolute',
      'top': '324px',
      'left': '350px',
      'font-size': '18px',
      'color': '#636363',
    });
  };

  const handleLoadStartView = () => {
    const configDiv = $('#config').get(0);
    shouldShowLatencyBalloon = !!configDiv.dataset.showLatencyBalloon;
    latencyTarget1 = parseFloat(configDiv.dataset.latencyTarget1) * 1000;
    latencyTarget2 = parseFloat(configDiv.dataset.latencyTarget2) * 1000;

    // タイピング終了時に毎回削除されるので毎回設定する
    // jQuery#on で設定した関数内で例外が発生すると後続の関数も実行されなくなるので例外は潰す
    let waitingAcceptedFirstKey = false;
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