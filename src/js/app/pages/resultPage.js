import '../jquery.balloon.min';
import '../../fontawesome';
import {setTimeTooltip} from '../timeTooltip';
import {ADD_HEIGHT} from '../constants';
import {OriginalResult} from '../models';

export default class ResultPage {
  constructor(extensionRootPath) {
    this._extensionRootPath = extensionRootPath;
  }

  _parseTime(timeStr) {
    if (timeStr.includes('分')) {
      const [m, s] = timeStr.split('分');
      return m * 60000 + s.replace('秒', '.') * 1000;
    }
    return timeStr.replace('秒', '.') * 1000;
  }

  _selectResult(title) {
    return $(`#current .result_data ul .title:contains("${title}")`).next().text();
  }

  originalResult() {
    return new OriginalResult({
      score: this._selectResult('スコア'),
      level: this._selectResult('レベル'),
      time: this._parseTime(this._selectResult('入力時間')),
      charCount: parseInt(this._selectResult('入力文字数'), 10),
      missCount: parseInt(this._selectResult('ミス入力数'), 10),
      wpm: parseFloat(this._selectResult('WPM')),
      accuracy: parseFloat(this._selectResult('正確率')) / 100,
    });
  }

  expand() {
    // 新しいウィンドウに #app をコピーして CSS 読み込み
    // 'about:blank' を指定しないとリサイズができない https://stackoverflow.com/questions/35341839/chrome-zoom-is-not-working-in-child-tab
    const newDoc = window.open('about:blank').document;
    newDoc.write($('#app').html());
    Array.from($('head>link[rel="stylesheet"]'), style => newDoc.write(style.outerHTML));
    newDoc.write(`<script type="text/javascript" src="${this._extensionRootPath}jquery.js"></script>`);
    newDoc.write(`<script type="text/javascript" src="${this._extensionRootPath}expanded.bundle.js"></script>`);
  }

  _showWordDetail({ $sentence, charTimes, missTimes, time, miss, latency }) {
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

  /**
   * @param {Result} result
   * @param {Result} previousResult
   */
  extend({ result, previousResult }) {
    // ワード詳細
    const $sentences = $('#exampleList li .sentence').css('cursor', 'default');
    for (let i = 0; i < $sentences.size(); i++) {
      this._showWordDetail({
        $sentence: $sentences.eq(i),
        charTimes: result.charTimes[i],
        missTimes: result.missTimes[i],
        time: result.times[i],
        miss: result.misses[i],
        latency: result.latencies[i],
      });
    }

    // 苦手キー邪魔なので除去
    $('#current .result_data ul li').last().remove();
    $('#prev .result_data ul li').last().remove();

    // 初速
    $('#current .result_data ul').append(`<li id="latency"><div class="title">Latency</div><div class="data">${result.latency.toFixed(3)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_latency"><div class="data">${previousResult == null ? '-' : previousResult.latency.toFixed(3)}</div></li>`);

    // RKPM
    $('#current .result_data ul').append(`<li id="rkpm"><div class="title">RKPM</div><div class="data">${result.rkpm.toFixed(2)}</div></li>`);
    $('#prev .result_data ul').append(`<li id="previous_rkpm"><div class="data">${previousResult == null ? '-' : previousResult.rkpm.toFixed(2)}</div></li>`);

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
      this.expand();
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
}
