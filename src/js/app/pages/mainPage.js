import '../jquery.balloon.min';
import {ADD_HEIGHT} from '../constants';

export default class MainPage {
  constructor() {
    // 見た目調整
    $('#app').css('height', `+=${ADD_HEIGHT}px`);
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