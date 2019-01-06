import './jquery.balloon.min';
import '../../fontawesome';
import Calculator from './calculator';
import {removeAllTimeTooltips, setTimeTooltip} from './timeTooltip';

class MainPage {
  constructor() {
    const ADD_ROWS = 1;
    this.ADD_HEIGHT = 32 * ADD_ROWS;

    // 見た目調整
    $('#app').css('height', `+=${this.ADD_HEIGHT}px`);
  }

  expandResult(extensionRootPath) {
    // 新しいウィンドウに #app をコピーして CSS 読み込み
    // 'about:blank' を指定しないとリサイズができない https://stackoverflow.com/questions/35341839/chrome-zoom-is-not-working-in-child-tab
    const newDoc = window.open('about:blank').document;
    newDoc.write($('#app').html());
    Array.from($('head>link[rel="stylesheet"]'), style => newDoc.write(style.outerHTML));
    // TODO: src/ の中から読む
    newDoc.write('<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>');
    newDoc.write(`<script type="text/javascript" src="${extensionRootPath}expanded.bundle.js"></script>`);
  }

  showWordDetail(charTimes, $sentence, missTimes, time, latency, miss) {
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
      return setTimeTooltip($key, toolTip).attr('data-tooltip', toolTip);
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

  extendResult({ misses, times, latencies, charTimes, missTimes, previousResult, rkpm, latency }) {
    console.log(this);
    // ワード詳細
    const $sentences = $('#exampleList li .sentence').css('cursor', 'default');
    for (let i = 0; i < $sentences.size(); i++) {
      this.showWordDetail(charTimes[i], $sentences.eq(i), missTimes[i], times[i], latencies[i], misses[i]);
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
    $('#result article').css('height', `+=${this.ADD_HEIGHT}px`);
    $('#result #exampleList').css('height', `+=${this.ADD_HEIGHT}px`);
    $('#result .result_data').css('height', `+=${this.ADD_HEIGHT}px`);
    $('#result #current').css('height', `+=${this.ADD_HEIGHT}px`);
    $('#result #prev').css('height', `+=${this.ADD_HEIGHT}px`);
    // マウスで選択できるようにする
    $('#result').css({ 'user-select': 'text' });
    // 全画面表示ボタン
    $('<i class="fas fa-external-link-alt">').addClass('expand_result').appendTo($('#current')).on('click', () => {
      this.expandResult();
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

  showLatencyBalloon(latency, target1, target2) {
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

  hideLatencyBalloon() {
    $('.balloon').remove();
  };
}

const setEventHandlers = ({ $, onLoadStartView, onStartCountdown, onShowWord, onAccept, onMiss, onFinishWord, onEscape, onShowResult, resultShortCutKeys }) => {
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
};

// タイピング画面に注入される
jQuery(($) => {
  console.log('٩( ๑╹ ꇴ╹)۶');

  let shouldShowLatencyBalloon;
  let latencyTarget1;
  let latencyTarget2;
  let extensionRootPath;
  let waitingAcceptedFirstKey = false;
  let showWordTime;

  const page = new MainPage();
  const calc = Calculator({ $, extendResult: page.extendResult.bind(page) });

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
    extensionRootPath = configDiv.dataset.extensionRootPath;
  };

  setEventHandlers({
    $,
    onLoadStartView: () => {
      updateConfig();
      // リザルトで文字別タイムが表示されたまま R でリトライするとツールチップが残ったままになる
      removeAllTimeTooltips();
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
          page.showLatencyBalloon(now - showWordTime, latencyTarget1, latencyTarget2);
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
      page.hideLatencyBalloon();
    },
    onEscape: () => {
      calc.handleEscape(Date.now());
      page.hideLatencyBalloon();
    },
    onShowResult: () => {
      calc.handleShowResult();
    },
    resultShortCutKeys: {
      // F (Full result)
      70: () => {
        page.expandResult(extensionRootPath);
      },
    },
  });
});
