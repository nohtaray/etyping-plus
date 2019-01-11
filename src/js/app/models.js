export class OriginalResult {
  constructor({ score, level, time, charCount, missCount, wpm, accuracy }) {
    this.score = score;
    this.level = level;
    this.time = time;
    this.charCount = charCount;
    this.missCount = missCount;
    this.wpm = wpm;
    this.accuracy = accuracy;
  }
}

export class Result {
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
