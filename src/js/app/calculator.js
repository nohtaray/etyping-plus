class Result {
  constructor({ misses, times, latencies, charTimes, missTimes, latency, rkpm }) {
    this.misses = misses;
    this.times = times;
    this.latencies = latencies;
    this.charTimes = charTimes;
    this.missTimes = missTimes;
    this.latency = latency;
    this.rkpm = rkpm;
  }
}

export default class {
  constructor({ $, extendResult }) {
    // TODO: jQuery にアクセスしない
    this.$ = $;
    this.extendResult = extendResult;

    this.latencies = [];
    this.misses = [];
    this.times = [];
    this.charTimes = [];
    this.missTimes = [];
    this.result = null;

    this.wordStartTime = null;
    this.charStartTime = null;
    this.wordMiss = 0;
    this.wordCharTimes = [];
    this.wordMissTimes = [];
    this.charMissTimes = [];
  }

  handleShowWord(now) {
    this.wordStartTime = this.charStartTime = now;
    this.wordMiss = 0;
    this.wordCharTimes = [];
    this.wordMissTimes = [];
    this.charMissTimes = [];
  }

  handleFinishWord(now) {
    const wordTime = now - this.wordStartTime;
    this.times.push(wordTime);
    this.misses.push(this.wordMiss);
    this.charTimes.push(this.wordCharTimes);
    this.missTimes.push(this.wordMissTimes);
  }

  handleAcceptFirstKey(now) {
    const latency = now - this.wordStartTime;
    this.latencies.push(latency);
  }

  handleAccept(now) {
    const time = now - this.charStartTime;
    this.wordCharTimes.push(time);
    this.wordMissTimes.push(this.charMissTimes);
    this.charStartTime += time;
    this.charMissTimes = [];
  }

  handleMiss(now) {
    const time = now - this.charStartTime;
    this.charMissTimes.push(time);
    this.wordMiss += 1;
  }

  handleEscape(now) {
    const time = now - this.wordStartTime;
    this.times.push(time);
    this.misses.push(this.wordMiss);
    this.wordMissTimes.push(this.charMissTimes);
    this.charTimes.push(this.wordCharTimes);
    this.missTimes.push(this.wordMissTimes);
  }

  handleShowResult() {
    const resultMissCount = +this.$('#current .result_data ul .title:contains("ミス入力数")').next().text();
    if (this.misses.reduce((a, b) => a + b, 0) === resultMissCount - 1) {
      // TODO: この辺も外に出す
      // 1足りない == LT 機能でミスって終わった
      const lastWordMissTimes = this.missTimes[this.missTimes.length - 1];
      lastWordMissTimes[lastWordMissTimes.length - 1].push(0);
      this.misses[this.misses.length - 1] += 1;
    }

    const parseTime = (timeStr) => {
      if (timeStr.includes('分')) {
        const [m, s] = timeStr.split('分');
        return m * 60000 + s.replace('秒', '.') * 1000;
      }
      return timeStr.replace('秒', '.') * 1000;
    };
    const latenciesSum = this.latencies.map(a => +a).reduce((a, b) => a + b, 0);
    const time = parseTime(this.$('#current .result_data ul .title:contains("入力時間")').next().text());
    const charCount = +this.$('#current .result_data ul .title:contains("入力文字数")').next().text();
    const latency = latenciesSum / this.latencies.length / 1000;
    const rkpm = (charCount - this.latencies.length) / (time - latenciesSum) * 60000;

    this.result = new Result({
      misses: this.misses,
      times: this.times,
      latencies: this.latencies,
      charTimes: this.charTimes,
      missTimes: this.missTimes,
      latency,
      rkpm,
    });

    this.misses = [];
    this.times = [];
    this.charTimes = [];
    this.missTimes = [];
    this.latencies = [];
  }
}
