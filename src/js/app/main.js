import Calculator from './calculator';
import {removeAllTimeTooltips} from './timeTooltip';
import MainPage from './pages/mainPage';
import ResultPage from './pages/resultPage';

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
  let previousResult;

  const mainPage = new MainPage();
  let resultPage;
  let calc = new Calculator();

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
      calc = new Calculator();
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
          mainPage.showLatencyBalloon(now - showWordTime, latencyTarget1, latencyTarget2);
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
      mainPage.hideLatencyBalloon();
    },
    onEscape: () => {
      calc.handleEscape(Date.now());
      mainPage.hideLatencyBalloon();
    },
    onShowResult: () => {
      resultPage = new ResultPage(extensionRootPath);
      calc.handleShowResult(resultPage.originalResult());
      resultPage.extend({
        misses: calc.result.misses,
        times: calc.result.times,
        latencies: calc.result.latencies,
        charTimes: calc.result.charTimes,
        missTimes: calc.result.missTimes,
        latency: calc.result.latency,
        rkpm: calc.result.rkpm,
        previousResult,
      });
      previousResult = calc.result;
    },
    resultShortCutKeys: {
      // F (Full result)
      70: () => {
        resultPage.expand();
      },
    },
  });
});
