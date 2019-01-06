import {setTimeTooltip} from './timeTooltip';

// 全画面リザルトページ
{
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
  $('#exampleList li .sentence span[data-tooltip]').each((_, e) => {
    setTimeTooltip($(e), $(e).data('tooltip'));
  });
}
