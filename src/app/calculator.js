// TODO: クラス化
const Calculator = ({ $, expandResult, extendResult }) => {
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
};
